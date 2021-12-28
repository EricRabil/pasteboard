import { PasteRegion } from "@pasteboard/core";
import RedisPasteAdapter from "../RedisPasteAdapter";

describe("RedisPasteAdapter", () => {
    const adapter = new RedisPasteAdapter({
        
    });

    beforeAll(async () => {
        await adapter.setup();
    });

    afterAll(async () => {
        await adapter.shutdown();
    });

    describe('scaffolding', () => {
        afterEach(async () => {
            await adapter.clear();
        });

        it('should generate paths in between', async () => {
            const region = new PasteRegion('.a.b.c');
    
            await adapter.put(region, '{}');
    
            expect(await adapter.get(region))
                .toEqual('{}');
        });
    
        it('should support array generation', async () => {
            const region = new PasteRegion('.d.e[4].f');
    
            await adapter.put(region, '{}');
    
            expect(await adapter.get(region))
                .toEqual('{}');
        });
    
        it('shouldnt trample existing data structures when generating', async () => {
            const region = new PasteRegion('.a.b.c');
    
            expect(await adapter.put(region, '{}')).toBe(true);
    
            expect(await adapter.get(region))
                .toEqual('{}');
    
            const conflictRegion = new PasteRegion('.a.b[4].c');
    
            expect(await adapter.put(conflictRegion, '{}')).toBe(false);

            expect(await adapter.get(PasteRegion.root))
                .toEqual(JSON.stringify({ a: { b: { c: { } } } }));
        });
    });

    describe('pubsub', () => {
        afterEach(async () => {
            await adapter.clear();
        });

        it('should do simple keyspace notifications', async () => {
            const region = new PasteRegion('.a.b.c');

            let counter = 0;

            const pending = new Promise<[string, string]>(async (resolve, reject) => {
                await adapter.observe({
                    region
                }, (json, path) => {
                    counter++;
                    resolve([path, json]);
                });
            });

            const json = '{"p":{}}';

            expect(await adapter.put(region, json)).toBe(true);

            const [ path, publishedJSON ] = await pending;

            expect(path).toBe(region.jsonPath);
            expect(publishedJSON).toBe(json);
            expect(counter).toBe(1); // if this is failing, multiple publishes are happening for this which is wrong
            
            const subregion = region.childByAppendingJSONPath('.d.e.f');
            expect(await adapter.put(subregion, '{}')).toBe(true);
        });
    });

    describe('error handling', () => {
        it('should gracefully reject malformed json', async () => {
            const region = new PasteRegion('.b');

            expect(await adapter.put(region, ']')).toBe("malformed json");
            expect(await adapter.put(region, "{")).toBe("malformed json");
        });
    });
});