import { createClient, defineScript, RedisClientOptions, RedisClientType, RedisScripts } from "redis";
import { ArrayBlueprint, Blueprint, PasteRegion } from "@pasteboard/core";
import createBlueprintPipeline, { BlueprintPipelineStep } from "../utils/blueprint-pipeline";
import debug from "../utils/debug";
import { RedisClientMultiCommandType } from "@node-redis/client/dist/lib/client/multi-command";
import { RedisJSON } from "@node-redis/json/dist/commands";
import RedisCommandsQueue, { QueueCommandOptions } from "@node-redis/client/dist/lib/client/commands-queue";
import { RedisCommandArguments, RedisCommandRawReply } from "@node-redis/client/dist/lib/commands";
import { readFileSync } from "fs";
import { resolve } from "path";
import subscribePatternForRegion from "../utils/region-pattern";
// import debug from "../utils/debug";

export class AggregateError extends Error {
    underlyingErrors: Error[];

    constructor(errors: Error[], name = errors[0]?.name, message = errors[0]?.message, stack = errors[0]?.stack) {
        super(message);
        this.underlyingErrors = errors;
        this.name = name;
        this.stack = stack;
    }
}

export interface PasteObservationOptions {
    region: PasteRegion;
    descendants?: boolean;
}

type ExtractGeneric<X> = X extends RedisClientType<infer U, infer P> ? U : never;

type Scripts = {
    create_expanded_array: (typeof RedisPasteAdapter)["create_expanded_array"];
    spublish: (typeof RedisPasteAdapter)["spublish"];
};

type Options = Omit<RedisClientOptions<never, Scripts>, 'modules'>;
export type Modules = ExtractGeneric<ReturnType<typeof createClient>>;
export type PasteRedis = RedisClientType<Modules, Scripts>;
export type PasteRedisMulti = RedisClientMultiCommandType<Modules, Scripts>;

class RedisFailure extends Error {
    args: RedisCommandArguments;
    options?: QueueCommandOptions;
    bufferMode?: boolean;
    
    constructor(error: Error, args: RedisCommandArguments, options?: QueueCommandOptions, bufferMode?: boolean) {
        super(error.message);
        this.name = error.name;
        this.stack = error.stack;
        this.args = args;
        this.options = options;
        this.bufferMode = bufferMode;
    }
}

const superAddCommand = RedisCommandsQueue.prototype.addCommand;
RedisCommandsQueue.prototype.addCommand = function(this: RedisCommandsQueue, args, options, bufferMode) {
    return superAddCommand.call(this, args, options, bufferMode).catch(error => {
        if (args[0] === 'EVALSHA' && error?.message?.startsWith?.('NOSCRIPT')) throw error;
        return new RedisFailure(error, args, options, bufferMode);
    });
} as typeof superAddCommand;

/** @internal */
function loadText(path: string): string {
    return readFileSync(resolve(__dirname, '..', '..', path)).toString('utf8');
}

export default class RedisPasteAdapter {
    // @ts-ignore
    redis: PasteRedis;
    // @ts-ignore
    #pubsub: RedisClientType<Modules, {}>;

    namespace: string;

    static create_expanded_array = defineScript({
        SCRIPT: loadText('redis-scripts/set-filled-array.lua'),
        NUMBER_OF_KEYS: 1,
        transformArguments(namespace: string, path: string, length: number) {
            return [namespace, path, length.toString()];
        }
    });

    static spublish = defineScript({
        SCRIPT: loadText('redis-scripts/spublish.lua'),
        NUMBER_OF_KEYS: 1,
        transformArguments(namespace: string, path: string, value: string, nx?: boolean) {
            return [namespace, path, value].concat(nx ? ["NX"] : [])
        }
    });

    #rebuild: () => void;
    constructor(opts: Options = {
        url: process.env.REDIS_URL
    }, namespace: string = 'redis-pasteboard') {
        this.#rebuild = () => {
            this.redis = createClient({
                ...opts,
                scripts: {
                    create_expanded_array: RedisPasteAdapter.create_expanded_array,
                    spublish: RedisPasteAdapter.spublish
                }
            });
    
            this.#pubsub = createClient(opts);
        };
        this.#rebuild();

        this.namespace = namespace;
    }

    #setupLoop: ReturnType<typeof setTimeout> | null = null;
    async setup() {
        try {
            await Promise.all([this.redis.connect(), this.#pubsub.connect()]);
        } catch (e) {
            console.warn('failed to connect to redis:', e, 'trying again in 5000ms');
            if (this.#setupLoop) this.#setupLoop.refresh();
            else this.#setupLoop = setTimeout(() => {
                this.#rebuild();
                this.setup();
            }, 5000);
        }
    }

    async shutdown() {
        await Promise.all([this.redis.disconnect(), this.#pubsub.disconnect()]);
    }

    async #recursivelyCreate(region: PasteRegion, terminalValue?: string): Promise<boolean> {
        const steps = createBlueprintPipeline(this.namespace, region.blueprint);

        if (terminalValue) {
            steps.push({
                region,
                executor: multi => multi.spublish(this.namespace, region.jsonPath, terminalValue),
                intent: 'set ' + region.jsonPath + ' to terminal value',
                cursor: {
                    kind: "object"
                }
            })
        }
        const pipeline = steps.map(step => step.executor);

        if (debug.enabled) {
            debug('execute pipeline: ', steps.map(step => step.intent));
        }

        let multi = this.redis.multi();

        for (const step of pipeline) {
            multi = step(multi);
        }

        try {
            const result = await multi.exec(true);

            if (debug.enabled) {
                for (let i = 0, step: BlueprintPipelineStep; i < steps.length, step = steps[i]; i++) {
                    const response = result[i];
                    
                    if (response instanceof RedisFailure) {
                        debug('intent ' + step.intent + ' failed with error ' + response.message);
                    } else {
                        debug('intent ' + step.intent + ' passed');
                    }
                }
            }

            return result[result.length - 1] === 'OK';
        } catch (error) {
            process.stderr.write("TRAP TRAP TRAP");
            process.exit();
        }
    }

    #set(region: PasteRegion, json: string): Promise<RedisCommandRawReply | RedisFailure> {
        return this.redis.spublish(this.namespace, region.jsonPath, json);
    }

    async clear() {
        await this.redis.json.del(this.namespace);
    }

    async #put_impl(region: PasteRegion, json: string): Promise<boolean | string> {
        const result = await this.#set(region, json);

        if (result instanceof RedisFailure) {
            if (result.message === "ERR new objects must be created at the root") {
                // someone doesnt exist
                return await this.#recursivelyCreate(region, json);
            } else {
                switch (result.message.slice(0,3)) {
                    case "EOF":
                    case "exp":
                        return "malformed json";
                }
                debugger;
            }
            return false;
        } else {
            if (result === null) {
                return await this.#recursivelyCreate(region, json);
            }

            return result === 'OK';
        }
    }

    put(region: PasteRegion, json: string): Promise<boolean | string> {
        return this.#put_impl(region, json);
    }

    async get(region: PasteRegion): Promise<string | null> {
        try {
            return await this.redis.sendCommand(['JSON.GET', this.namespace, region.jsonPath]);
        } catch (error) {
            if (error instanceof Error) {
                switch (error.message.slice(-14)) {
                    case "does not exist":
                        return null;
                }
            }

            throw error;
        }
    }

    async observe({ region, descendants }: PasteObservationOptions, callback: (json: string, path: string) => any): Promise<() => Promise<void>> {
        const pending: Array<Promise<any>> = [];

        pending.push(this.#pubsub.subscribe(region.jsonPath, callback));

        if (descendants) {
            const pattern = subscribePatternForRegion(region);
            pending.push(this.#pubsub.pSubscribe(pattern, callback));
        }

        await Promise.all(pending);

        return async () => {
            const pending: Array<Promise<any>> = [];

            pending.push(this.#pubsub.unsubscribe(region.jsonPath, callback));

            if (descendants) {
                const pattern = subscribePatternForRegion(region);
                pending.push(this.#pubsub.pUnsubscribe(pattern, callback));
            }

            await Promise.all(pending);
        }
    }
}