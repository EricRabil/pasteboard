import Blueprint from "../Blueprint";
import PasteRegion from "../PasteRegion";

describe('PasteRegion', () => {
    it('should support ancestor traversal', () => {
        const region = new PasteRegion('$.a.b.c');

        expect(region.ancestors[0].jsonPath).toEqual('.');
        expect(region.ancestors[1].jsonPath).toEqual('.a');
        expect(region.ancestors[2].jsonPath).toEqual('.a.b');
        expect(region.ancestors.length).toEqual(3);
    });

    it('should return copies instead of the underlying arrays', () => {
        const region = new PasteRegion('.a.b.c');

        expect(region.ancestors).not.toBe(region.ancestors);
        expect(region.nodes).not.toBe(region.nodes);
    });

    it('should resolve non-absolute regions', () => {
        expect(new PasteRegion('a.b.c').jsonPath)
            .toEqual('.a.b.c');

        expect(new PasteRegion('.a.b.c').jsonPath)
            .toEqual('.a.b.c');
    });

    it('should produce a proper xpath', () => {
        const region = new PasteRegion('.a.b.c');

        expect(region.xpath).toEqual('/a/b/c');
    });

    function blueObject(): Blueprint
    function blueObject(key: string, value: Blueprint): Blueprint
    function blueObject(key?: string, value?: Blueprint): Blueprint {
        return {
            kind: 'object',
            childKey: key,
            childValue: value
        }
    }

    function blueArray(index: number): Blueprint
    function blueArray(index: number, value: Blueprint): Blueprint
    function blueArray(index: number, value?: Blueprint): Blueprint {
        return {
            kind: 'array',
            length: index + 1,
            childKey: index,
            childValue: value
        }
    }

    it('should make a blueprint with missing array parts', () => {
        const region = new PasteRegion('.a.b[30].c.d.e.f');

        expect(region.blueprint).toEqual(
            blueObject('a', blueObject('b', blueArray(30, blueObject('c', blueObject('d', blueObject('e', blueObject()))))))
        );
    });

    it('should treat a numeric child literal as a object key instead of array', () => {
        const region = new PasteRegion('.a.b.30.c.d.e.f');

        expect(region.blueprint).toEqual(
            blueObject('a', blueObject('b', blueObject('30', blueObject('c', blueObject('d', blueObject('e', blueObject()))))))
        );
    });

    it('should properly support appending regions', () => {
        const baseRegion = new PasteRegion('.a.b.c');

        expect(baseRegion.childByAppendingJSONPath('d.e.f').jsonPath)
            .toEqual('.a.b.c.d.e.f');

        expect(baseRegion.childByAppendingJSONPath('[4]').jsonPath)
            .toEqual('.a.b.c[4]')

        expect(baseRegion.childByAppendingJSONPath('$.a.b.c').jsonPath)
            .toEqual('.a.b.c.a.b.c')

        expect(baseRegion.childByAppendingJSONPath('..a.b.c').jsonPath)
            .toEqual('.a.b.c..a.b.c')

        expect(baseRegion.childByAppendingJSONPath('.a.b.c').jsonPath)
            .toEqual('.a.b.c.a.b.c')
    });

    it('should convert a $ path to a .', () => {
        expect(new PasteRegion('.').jsonPath)
            .toEqual('.');
    });

    it('should support root regions', () => {
        const region = new PasteRegion('$');

        expect(region.jsonPath)
            .toEqual('.');
    });

    it('should infer a root region from an empty string', () => {
        const region = new PasteRegion('');

        expect(region.jsonPath)
            .toEqual('.');
    });

    describe('slicing', () => {
        it('should generate logical suffix strings', () => {
            const region = new PasteRegion('.green.eggs.and.ham');
    
            expect(region.suffix(0).jsonPath).toBe('.');
            expect(region.suffix(1).jsonPath).toBe('.ham');
            expect(region.suffix(2).jsonPath).toBe('.and.ham');
            expect(region.suffix(3).jsonPath).toBe('.eggs.and.ham');
            expect(region.suffix(4).jsonPath).toBe('.green.eggs.and.ham');
            expect(region.suffix(5).jsonPath).toBe('.green.eggs.and.ham');
        });

        it('should generate logical prefix strings', () => {
            const region = new PasteRegion('.green.eggs.and.ham');

            expect(region.prefix(0).jsonPath).toBe('.');
            expect(region.prefix(1).jsonPath).toBe('.green');
            expect(region.prefix(2).jsonPath).toBe('.green.eggs');
            expect(region.prefix(3).jsonPath).toBe('.green.eggs.and');
            expect(region.prefix(4).jsonPath).toBe('.green.eggs.and.ham');
            expect(region.prefix(5).jsonPath).toBe('.green.eggs.and.ham');
        });

        it('should treat subscripts as individual nodes', () => {
            const region = new PasteRegion('.green.eggs[4].and.ham');

            expect(region.prefix(2).jsonPath).toBe('.green.eggs');
            expect(region.prefix(3).jsonPath).toBe('.green.eggs[4]');
        });

        it('should allow you to truncate the first one with slice(-1)', () => {
            const region = new PasteRegion('.green.eggs[4].and.ham');

            expect(region.slice(0, -1).jsonPath).toBe('.green.eggs[4].and');
        });
    });
});