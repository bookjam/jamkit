declare module "ipfs-http-client" {
    export function create(options?: any): Promise<any>;
    export function globSource(basePath: string, pattern: string): any;
}