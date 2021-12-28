declare module "xpath" {
    export interface PathExpr {
        filter?: { str: string; } | { num: number; };
        locationPath?: {
            steps: Array<{
                nodeTest: { name?: string; };
                predicates: PathExpr[];
            }>;
        }
    }

    export interface XPathInstance {
        parse(xpath: string): {
            expression: {
                expression: PathExpr;
            }
        }
    }

    declare const xp: XPathInstance;

    export default xp;
}