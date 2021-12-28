import jp, { AnyNode } from "jsonpath";

export function parsedJSONPathToXPath(parsedJSONPath: AnyNode[]): string {
    let xpath = "/";

    function insertSubscript(content: string) {
        xpath = xpath.slice(0, -1) + content + "/";
    }

    function appendPathComponent(pathComponent: string) {
        xpath += pathComponent + "/";
    }

    for (const node of parsedJSONPath) {
        switch (node.expression.type) {
            case 'root':
                continue;
            case 'identifier':
                if (typeof node.expression.value === "string") {
                    appendPathComponent(node.expression.value);
                } else {
                    insertSubscript(`[${node.expression.value}]`);
                }
                continue;
            case 'numeric_literal':
                insertSubscript(`[${node.expression.value}]`);
                continue;
            case 'string_literal':
                insertSubscript(`["${node.expression.value}"]`);
                continue;
        }
    }

    return xpath.slice(0, -1);
}

export default function jsonPathToXPath(jsonPath: string): string {
    return parsedJSONPathToXPath(jp.parse(jsonPath));
}