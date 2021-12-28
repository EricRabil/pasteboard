import { ArrayBlueprint, Blueprint, PasteRegion } from "@pasteboard/core";
import { PasteRedis, PasteRedisMulti } from "../structs/RedisPasteAdapter";

export interface BlueprintPipelineStep {
    executor: (redis: PasteRedisMulti) => PasteRedisMulti;
    intent: string;
    region: PasteRegion;
    cursor: Blueprint;
}

export default function createBlueprintPipeline(namespace: string, blueprint: Blueprint | undefined): BlueprintPipelineStep[] {
    const steps: BlueprintPipelineStep[] = [];
    let region = new PasteRegion();

    while (blueprint) {
        const jsonPath = region.jsonPath;
        if (blueprint.kind === 'object') {
            steps.push({
                executor: redis => redis.spublish(namespace, jsonPath, '{}', true),
                intent: 'create empty object at ' + jsonPath,
                region,
                cursor: blueprint
            });
            if (typeof blueprint.childKey === "string") {
                region = region.childByAppendingJSONPath(blueprint.childKey);
            }
        } else {
            const length = (<ArrayBlueprint>blueprint).length;
            steps.push({
                executor: redis => redis.create_expanded_array(namespace, jsonPath, length),
                intent: 'create array of length ' + length + ' at ' + jsonPath,
                region,
                cursor: blueprint
            });
            if (typeof blueprint.childKey === "number") {
                region = region.childByAppendingJSONPath(`[${blueprint.childKey}]`);
            }
        }

        blueprint = blueprint.childValue;
    }

    return steps;
}