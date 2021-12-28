import jp, { AnyNode, Node } from "jsonpath";
import { Blueprint } from "./Blueprint";
import debug from "../utils/debug";
import { parsedJSONPathToXPath } from "../utils/jsonpath-to-xpath";
import xpathToJSONPath from "../utils/xpath-to-jsonpath";
import MagicObject from "./internal/MagicObject";

const oldParse = jp.parser.parse
jp.parser.parse = function(input) {
    if (input.startsWith('.')) {
        input = '$' + input;
    }

    return oldParse.call(this, input);
}

const magicObject = new MagicObject();

export default class PasteRegion {
    #xpath: string | undefined;
    #jsonPath: string;
    #nodes: AnyNode[];
    #ancestors: PasteRegion[] | undefined;

    public static fromXPath(xPath: string): PasteRegion {
        if (xPath.endsWith('/')) {
            xPath = xPath.slice(0, -1);
        }

        const { failure, result } = xpathToJSONPath(xPath);

        if (failure) {
            throw new Error(JSON.stringify(failure));
        } else {
            const region = new PasteRegion(result!.jsonPath, result!.nodes);
            region.#xpath = xPath;
            return region;
        }
    }

    public static fromNodes(nodes: AnyNode[]): PasteRegion {
        return new PasteRegion(jp.stringify(nodes), nodes);
    }

    public static resolve(jsonPath: string, asRoot = false): string {
        outerSwitch:
        switch (jsonPath[0]) {
            case '.':
                if (asRoot && jsonPath.length === 1) {
                    jsonPath = '$';
                    break outerSwitch;
                }
            case '[':
                jsonPath = '$' + jsonPath;
                break outerSwitch;
            case '$':
                switch (jsonPath[1]) {
                    case '.':
                        if (jsonPath.length === 2) {
                            jsonPath = '$';
                        }
                    case '[':
                        break outerSwitch;
                }
            case undefined:
                jsonPath = '$';
                break;
            default:
                jsonPath = '$.' + jsonPath;
                break;
        }

        return jsonPath;
    }

    static #root = Object.seal(new PasteRegion());

    static get root(): PasteRegion {
        return this.#root;
    }

    public constructor(jsonPath: string = '$', nodes: AnyNode[] | undefined = undefined) {
        jsonPath = PasteRegion.resolve(jsonPath, true);

        if (!nodes) nodes = jp.parse(jsonPath);
        else nodes = nodes.slice();

        this.#jsonPath = jsonPath;
        this.#nodes = nodes;
    }

    /**
     * Returns the JSONPath-compliant string for this region
     */
    public get jsonPath(): string {
        return this.#jsonPath.slice(1) || '.';
    }

    /**
     * Returns a region which references the last n path components of the current region
     * @param components number of components to include
     * @returns a new PasteRegion
     */
    public suffix(components: number): PasteRegion {
        if (components === 0) return PasteRegion.root;
        return this.slice(Math.abs(components) * -1);
    }

    /**
     * Returns a region which references the first n path components of the current region
     * @param components number of components to include
     * @returns a new PasteRegion
     */
    public prefix(components: number): PasteRegion {
        if (components === 0) return PasteRegion.root;
        const region = this.slice(0, components + 1 /* take into account root token */);

        if (components > 0 && this.#ancestors) {
            // prefix, carry over ancestors
            region.#ancestors = this.#ancestors?.slice(components);
        }

        return region;
    }

    public slice(from: number, upTo?: number): PasteRegion {
        const nodes = this.#nodes.slice(from, upTo);
        return new PasteRegion(jp.stringify(nodes), nodes);
    }

    /**
     * Returns a copy of the underlying JSONPath nodes
     */
    public get nodes(): AnyNode[] {
        return this.#nodes.slice();
    }

    /**
     * Returns the xPath-compliant string for this region
     */
    public get xpath(): string {
        if (this.#xpath) return this.#xpath;
        this.#xpath = parsedJSONPathToXPath(this.#nodes);
        return this.xpath;
    }

    /**
     * Returns the last ancestor
     */
    public get parent(): PasteRegion {
        if (this.isRoot) {
            return this;
        }

        return this.ancestors[this.ancestors.length - 1];
    }

    /**
     * Returns true if there are no nodes or the only node is root
     */
    public get isRoot(): boolean {
        if (this.#nodes.length === 0) {
            return true;
        } else {
            if (this.#nodes.length === 1) {
                return this.#nodes[0].expression.type === "root";
            } else {
                return false;
            }
        }
    }

    /**
     * Returns true if the top node is a numeric subscript
     */
    public get isNumericSubscript(): boolean {
        return (this.#nodes[this.#nodes.length - 1] as Node).operation === 'subscript';
    }

    get #top(): AnyNode {
        return this.#nodes[this.#nodes.length - 1];
    }

    public get subscriptingIndex(): number {
        switch (this.#top.expression.type) {
            case 'numeric_literal':
                return this.#top.expression.value as number;
            default:
                return NaN;
        }
    }

    public get memberIndex(): string {
        return this.#top.expression.value.toString();
    }

    #computeAncestors(): PasteRegion[] {
        const ancestors: PasteRegion[] = [];

        const nodes = this.#nodes.slice(0, -1);
        
        while (nodes.length) {
            ancestors.unshift(PasteRegion.fromNodes(nodes));
            nodes.pop();
        }

        ancestors.forEach((ancestor, index, ancestors) => {
            ancestor.#ancestors = ancestors.slice(0, index);
        });

        return ancestors;
    }

    /**
     * Returns a copy of the ancestors for this PasteRegion
     */
    public get ancestors(): PasteRegion[] {
        if (this.#ancestors) return this.#ancestors.slice();
        this.#ancestors = this.#computeAncestors();
        return this.ancestors;
    }

    public get blueprint(): Blueprint {
        magicObject.prepare();
        jp.query(magicObject.proxy, this.jsonPath);

        return magicObject.finish();
    }

    public childByAppendingJSONPath(jsonPath: string): PasteRegion {
        jsonPath = PasteRegion.resolve(jsonPath);

        const region = new PasteRegion(
            this.#jsonPath + jsonPath.slice(1),
            this.#nodes.concat(jp.parse(jsonPath).slice(1))
        );

        if (this.#ancestors) {
            region.#ancestors = this.#ancestors.concat(this);
        }

        return region;
    }
}
