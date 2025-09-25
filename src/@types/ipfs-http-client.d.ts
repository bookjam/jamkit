declare module "ipfs-http-client" {
    interface IPFSClient {
        addAll(source: AsyncIterable<any>): AsyncIterable<{ cid: { toString(): string } }>;
    }

    interface IPFSOptions {
        host?: string;
        port?: number | string;
        protocol?: "http" | "https";
        [key: string]: any;
    }

    export function create(options?: IPFSOptions): Promise<IPFSClient>;
    export function globSource(basePath: string, pattern: string): AsyncIterable<any>;
}