import jsonPathToXPath from "../jsonpath-to-xpath";

describe('jsonPathToXPath', () => {
    it('should properly convert a simple jsonpath', () => {
        expect(jsonPathToXPath('$.a.b.c'))
            .toEqual('/a/b/c')
    });

    it('should strip recursive jsonpaths', () => {
        expect(jsonPathToXPath('$..a.b.c'))
            .toEqual('/a/b/c');
    });

    it('should support numeric subscripts', () => {
        expect(jsonPathToXPath('$.a.b[3].c'))
            .toEqual('/a/b[3]/c');
    });

    it('should support string literal subscripts', () => {
        expect(jsonPathToXPath('$.a.b["asdf"].c'))
            .toEqual('/a/b["asdf"]/c');
    });

    it('should convert curried subscripts', () => {
        expect(jsonPathToXPath('$.a.b["asdf"][1234].c'))
            .toEqual('/a/b["asdf"][1234]/c')
    });
});