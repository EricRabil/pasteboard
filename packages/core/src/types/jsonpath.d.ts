declare module "jsonpath" {
    interface SomeNode<ExpressionType, Value> {
        expression: {
            type: ExpressionType;
            value: Value;
        }
    }

    interface AttributedNode<ExpressionType, Value> extends SomeNode<ExpressionType, Value> {
        operation: 'subscript' | 'member';
        scope: 'child' | 'descendant';
    }
    
    export interface NumericNode extends AttributedNode<'numeric_literal', number> {

    }

    export interface StringLiteralNode extends AttributedNode<'string_literal', string> {

    }

    export interface IdentifierNode extends AttributedNode<'identifier', string | number> {

    }

    export type Node = NumericNode | StringLiteralNode | IdentifierNode;

    export interface RootNode extends SomeNode<'root', '$'> {

    }

    export type AnyNode = RootNode | Node;

    export interface Parser {
        parse(input: string): AnyNode[];
    }

    export interface Handlers {
        _fns: Record<string, (component: AnyNode, partial: { path: (string | number)[], value: any }, count: number) => any[]>;
    }

    export interface JSONPath {
        parser: Parser;
        handlers: Handlers;

        stringify(nodes: AnyNode[]): string;
        parse(path: string): AnyNode[];
        query(object: any, path: string): any;
    }

    declare const jp: JSONPath;

    export default jp;
}