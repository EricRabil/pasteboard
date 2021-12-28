import { PasteRegion } from "@pasteboard/core";
import Pasteboard from "@pasteboard/redis";
import express, { Router } from "express";
import expressWs from "express-ws";
import Debug from "debug";

const debug = Debug("pasteboard:server");

const { app } = expressWs(express());
const pasteboard = new Pasteboard();

const v1 = Router();

v1.get("/board/*", async (req, res, next) => {
    let path: string = '/' + (<any>req.params)[0];
    
    try {
        const region = PasteRegion.fromXPath(path);
        debug('query pasteboard for region', region.jsonPath);
        const json = await pasteboard.get(region);
        if (typeof json === "string") {
            res.type('application/json').status(200).send(json);
        } else {
            res.status(404).end();
        }
    } catch (error) {
        res.status(500).json({ });
    }
});

interface GatewayRequest {
    type: "subscribe" | "unsubscribe";
    paths: (string | { path: string; descendants: boolean; })[];
    id?: number;
}

v1.ws("/gateway", (socket, request) => {
    const unsubscribeHooks: Record<string, () => Promise<void>> = {};

    function fault(message: string) {
        if (process.env.STRICT_SOCKETS) {
            socket.close();
        } else {
            socket.send(JSON.stringify({
                type: "fault",
                message
            }));
        }
        
        debug('socket fault:', message);
    }

    socket.on("close", () => Object.values(unsubscribeHooks).forEach(fire => fire()));

    socket.on("message", async message => {
        const body = message.toString("utf8");

        try {
            const payload: GatewayRequest = JSON.parse(body);
            if (typeof payload !== "object" || payload === null || !payload.paths?.length || !Array.isArray(payload.paths)) {
                return fault("malformed payload");
            }
            
            const tasks: Array<() => Promise<any>> = [];

            try {
                for (const entry of payload.paths) {
                    let region: PasteRegion, descendants: boolean;

                    if (typeof entry === "string") {
                        region = new PasteRegion(entry);
                        descendants = false;
                    } else if (typeof entry === "object" && entry !== null && "path" in entry && typeof entry.path === "string") {
                        region = new PasteRegion(entry.path);
                        descendants = entry.descendants ?? true;
                    } else {
                        return fault("malformed entry");
                    }

                    switch (payload.type) {
                    case "subscribe":
                        if (region.jsonPath in unsubscribeHooks) {
                            continue;
                        }
    
                        tasks.push(async () => {
                            const hook = await pasteboard.observe({ region, descendants }, (json, path) => {
                                socket.send(JSON.stringify({ type: "notify", path, json }));
                            });
                            return unsubscribeHooks[region.jsonPath] = hook;
                        });
                        
                        break;
                    case "unsubscribe":
                        if (!(region.jsonPath in unsubscribeHooks)) {
                            continue;
                        }

                        const { jsonPath } = region;
                        const hook = unsubscribeHooks[jsonPath];
                        tasks.push(() => hook().then(() => delete unsubscribeHooks[jsonPath]));

                        break;
                    default:
                        return fault("unknown payload type");
                    }
                }
            } catch (e) {
                return fault("malformed region");
            }
            
            await Promise.all(tasks.map(fire => fire()));
            debug('subscribed socket to', tasks.length, 'tasks');

            if (typeof payload.id === "number") {
                socket.send(JSON.stringify({ type: "ack", success: true, id: payload.id }));
            }
        } catch (e) {
            return;
        }
    });
});

app.use("/api/v1", v1);

pasteboard.setup().then(() => {
    app.listen(+process.env.HTTP_PORT! || 9999)
});