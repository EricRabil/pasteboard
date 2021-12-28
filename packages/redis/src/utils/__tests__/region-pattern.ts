import { PasteRegion } from "@pasteboard/core";
import subscribePatternForRegion from "../region-pattern";

describe('region patterns', () => {
    it('should produce a proper child pattern', () => {
        expect(subscribePatternForRegion(new PasteRegion('.a.b.c')))
            .toEqual('.a.b.c[.[]*');
    });
});