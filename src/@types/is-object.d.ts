declare module "is-object" {
    function isObject(value: any): value is object;
    export = isObject;
}