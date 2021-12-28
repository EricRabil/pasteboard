import jp from "jsonpath";
import Blueprint from "../Blueprint";


/**
 * Scaffolds out a skeleton object based on a JSONPath expression
 */
export default class MagicObject {
    static #proxyTarget: any = {};

    #proxy: any = new Proxy({}, {
        get: (_, subProperty) => {
            if (typeof subProperty === "symbol") {
                return MagicObject.#proxyTarget[subProperty];
            } else if (typeof this.#property === "undefined") {
                this.#property = subProperty;
            } else if (this.#snaggedToArray) {
                this.#snaggedToArray = false;
                this.#blueprintCursor.childKey = this.#property;
                this.#blueprintCursor = this.#blueprintCursor.childValue = {
                    kind: "array",
                    length: +subProperty + 1
                };
                this.#property = +subProperty;
            } else {
                this.#blueprintCursor.childKey = this.#property;
                this.#blueprintCursor = this.#blueprintCursor.childValue = {
                    kind: "object"
                };
                this.#property = subProperty;
            }

            return this.#proxy;
        },
        has() {
            return true;
        }
    });
    
    #property?: any;
    #snaggedToArray = false;

    #blueprintRoot: Blueprint = {
        kind: "object"
    };

    #blueprintCursor: Blueprint = this.#blueprintRoot;

    #oldSubscript = jp.handlers._fns['subscript-child-numeric_literal'];
    #oldMember = jp.handlers._fns['member-child-numeric_literal'];

    #hook() {
        jp.handlers._fns['subscript-child-numeric_literal'] = (component, partial, count) => {
            this.#snaggedToArray = true;
            return [{
                path: partial.path.concat(component.expression.value),
                value: partial.value[component.expression.value as number]
            }];
        }

        jp.handlers._fns['member-child-numeric_literal'] = function(component, partial, count) {
            return [{
                path: partial.path.concat(component.expression.value),
                value: partial.value[component.expression.value as number]
            }];
        }
    }

    get proxy(): any {
        return this.#proxy;
    }

    #unhook() {
        jp.handlers._fns['subscript-child-numeric_literal'] = this.#oldSubscript;
        jp.handlers._fns['member-child-numeric_literal'] = this.#oldMember;
    }

    prepare() {
        // this.#root = this.#target = {};
        this.#property = undefined;
        this.#snaggedToArray = false;
        this.#blueprintRoot = this.#blueprintCursor = {
            kind: "object"
        };
        this.#hook();
    }

    get blueprint(): Blueprint {
        return this.#blueprintRoot;
    }

    finish(): Blueprint {
        this.#unhook();
        return this.#blueprintRoot;
    }
}