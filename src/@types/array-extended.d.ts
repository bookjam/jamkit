declare module "array-extended" {
    interface ArrayExtended {
        union<T>(arr1: T[], arr2: T[]): T[];
        unique<T>(arr: T[]): T[];
    }
    const array: ArrayExtended;
    export = array;
}