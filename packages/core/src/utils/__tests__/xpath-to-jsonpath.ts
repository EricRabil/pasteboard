import xpathToJSONPath from "../xpath-to-jsonpath";

describe('xpathToJSONPath', () => {
    it('should properly convert a simple xpath', () => {
        const { failure, result } = xpathToJSONPath('/a/b/c');

        expect(failure).toBeUndefined();
        expect(result!.jsonPath)
            .toEqual('$.a.b.c');
    });

    it('should strip recursive xpaths', () => {
        const { failure, result } = xpathToJSONPath('//a/b/c');

        expect(failure).toBeUndefined();
        expect(result!.jsonPath)
            .toEqual('$.a.b.c');
    });

    it('should support numeric subscripts', () => {
        const { failure, result } = xpathToJSONPath('/a/b[3]/c');

        expect(failure).toBeUndefined();
        expect(result!.jsonPath)
            .toEqual('$.a.b[3].c');
    });

    it('should support string literal subscripts', () => {
        const { failure, result } = xpathToJSONPath('/a/b["asdf"]/c');

        expect(failure).toBeUndefined();
        expect(result!.jsonPath)
            .toEqual('$.a.b["asdf"].c');    
    });

    it('should convert alpha identifier subscripts', () => {
        const { failure, result } = xpathToJSONPath('/a/b[asdf]/c');

        expect(failure).toBeUndefined();
        expect(result!.jsonPath)
            .toEqual('$.a.b.asdf.c');
    });

    it('should convert alphanumeric subscripts', () => {
        const { failure, result } = xpathToJSONPath('/a/b[asdf1234]/c');

        expect(failure).toBeUndefined();
        expect(result!.jsonPath)
            .toEqual('$.a.b.asdf1234.c');
    });

    it('should convert curried subscripts', () => {
        const { failure, result } = xpathToJSONPath('//a//b[asdf][1234]/c');

        expect(failure).toBeUndefined();
        expect(result!.jsonPath)
            .toEqual('$.a.b.asdf[1234].c');
    });
});