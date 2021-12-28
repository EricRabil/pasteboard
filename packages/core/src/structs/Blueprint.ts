export interface ObjectBlueprint {
    kind: 'object';
    childKey: string;
    childValue: Blueprint;
}

export interface ArrayBlueprint {
    kind: 'array';
    length: number;
    childKey: number;
    childValue: Blueprint;
}

export type PartiallyPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Blueprint = ObjectBlueprint | ArrayBlueprint | PartiallyPartial<ObjectBlueprint | ArrayBlueprint, "childKey" | "childValue">;
export default Blueprint;