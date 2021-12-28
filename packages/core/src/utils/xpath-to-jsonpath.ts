import XPath, { PathExpr } from "xpath";
import jp, { Node, AnyNode } from "jsonpath";
import Result from "../structs/Result";

export interface ConvertedXPath {
    jsonPath: string;
    nodes: Node[];
}

export interface ConversionFailure {
    message: string;
    expr?: PathExpr;
}

export type XPathConversionResult = Result<ConvertedXPath, ConversionFailure>;

export function parsedXPathToJSONPath(parsedXPath: PathExpr): XPathConversionResult {
    const nodes: Node[] = [];

    function descend(expr: PathExpr, root = false): ConversionFailure | undefined {
        if (root) {
            if (expr.filter || !expr.locationPath) {
                return {
                    message: "root xpath contains illegal syntax",
                    expr
                };
            }
        }
        
        if (expr.filter) {
            if (expr.locationPath) {
                return {
                    message: "filter and locationPath are mutually exclusive"
                }
            }

            if ("str" in expr.filter) {
                nodes.push({
                    expression: {
                        type: 'string_literal',
                        value: expr.filter.str
                    },
                    scope: 'child',
                    operation: 'subscript'
                });
            } else if ("num" in expr.filter) {
                nodes.push({
                    expression: {
                        type: 'numeric_literal',
                        value: expr.filter.num
                    },
                    scope: 'child',
                    operation: 'subscript'
                });
            } else {
                return {
                    message: "unknown filter type"
                }
            }
        } else if (expr.locationPath) {
            for (const { nodeTest, predicates } of expr.locationPath.steps) {
                if ("name" in nodeTest) {
                    nodes.push({
                        expression: {
                            type: 'identifier',
                            value: nodeTest.name!
                        },
                        scope: 'child',
                        operation: 'member'
                    });
                }

                for (const predicate of predicates) {
                    const failure = descend(predicate);
                    if (failure) {
                        return failure;
                    }
                }
            }
        } else {
            return {
                message: "what the hell imma do with this?"
            }
        }

        return;
    }

    const failure = descend(parsedXPath, true);
    if (failure) {
        return Result.failure(failure);
    }

    return Result.success({
        jsonPath: jp.stringify([{
            expression: {
                type: 'root',
                value: '$'
            }
        } as AnyNode].concat(nodes)),
        nodes
    });
}

export default function xpathToJSONPath(xpath: string): XPathConversionResult {
    return parsedXPathToJSONPath(XPath.parse(xpath).expression.expression);
}