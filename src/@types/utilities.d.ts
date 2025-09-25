// Type declarations for utility modules

declare module 'is-object' {
    function isObject(value: any): value is object;
    export = isObject;
}

declare module 'is-empty-object' {
    function isEmptyObject(value: any): boolean;
    export = isEmptyObject;
}

declare module 'array-extended' {
    interface ArrayExtended {
        union<T>(arr1: T[], arr2: T[]): T[];
        unique<T>(arr: T[]): T[];
    }
    const array: ArrayExtended;
    export = array;
}