import * as http from 'http';
import * as ws from 'ws';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as which from 'which';
import * as express from 'express';
import { IOSAdapter } from './iosAdapter';
import { debug } from './remotedebug/logger';
import { EventEmitter } from 'events';

export class DebugProxy {
    private app;
    private http: http.Server | null = null;
    private wss: ws.Server | null = null;
    private adapter: IOSAdapter | null = null;
    private targetFetchTimer: NodeJS.Timer | null = null;

    constructor() {
        this.app = express();
    }

    public async run(serverPort: number): Promise<number> {
        debug('server.run, port=%s', serverPort);

        this.http = http.createServer(this.app);

        this.wss = new ws.Server({ server: this.http });
        this.wss.on('connection', (a, req) => {
            this.onWSSConnection(a, req);
        });

        this.setupHttpHandlers();

        // Start server and return the port number
        this.http.listen(serverPort);

        const webkitDebugProxyPath = getWebkitDebugProxyPath();
        if (!webkitDebugProxyPath) {
            return Promise.reject('ios-webkit-debug-proxy not found.');
        }

        const webkitDebugProxyPort = serverPort + 100;
        this.adapter = new IOSAdapter(webkitDebugProxyPath, webkitDebugProxyPort);

        return this.adapter
            .start()
            .then(() => {
                this.startTargetFetcher();
                return serverPort;
            });
    }

    // private async startServer(http: http.Server, port: number): Promise<number> {
    //     return new Promise((resolve, reject) => {
    //         http.on('error', (err) => {
    //             if (err.name === 'EADDRINUSE') {
    //                 this.startServer(http, port + 1).then(resolve).catch(reject);
    //             } else {
    //                 reject(err);
    //             }
    //         });
    //         http.listen(port, () => {
    //             resolve(port);
    //         });
    //     });
    // }

    public stop(): void {
        debug('server.stop');

        if (this.http) {
            this.http.close();
            this.http = null;
        }

        this.stopTargetFetcher();
        this.adapter?.stop();
        this.adapter = null;
    }

    private startTargetFetcher(): void {
        debug('server.startTargetFetcher');

        const fetch = () => {
            this.adapter?.getTargets().then(
                targets => {
                    debug(`server.startTargetFetcher.fetched.${targets.length}`);
                },
                err => {
                    debug(`server.startTargetFetcher.error`, err``);
                },
            );
        };
        this.targetFetchTimer = setInterval(fetch, 5000);
    }

    private stopTargetFetcher(): void {
        debug('server.stopTargetFetcher');
        if (!this.targetFetchTimer) {
            return;
        }
        clearInterval(this.targetFetchTimer);
        this.targetFetchTimer = null;
    }

    private setupHttpHandlers(): void {
        debug('server.setupHttpHandlers');

        this.app.get('/', (_req, res) => {
            debug('server.http.endpoint/');
            res.json({
                msg: 'Hello from Jamkit Debug Proxy',
            });
        });

        this.app.get('/refresh', (_req, res) => {
            this.adapter?.forceRefresh();
            res.json({
                status: 'ok',
            });
        });

        this.app.get('/json', (_req, res) => {
            debug('server.http.endpoint/json');
            this.adapter?.getTargets().then(targets => {
                res.json(targets);
            });
        });

        this.app.get('/json/list', (_req, res) => {
            debug('server.http.endpoint/json/list');
            this.adapter?.getTargets().then(targets => {
                res.json(targets);
            });
        });

        this.app.get('/json/version', (_req, res) => {
            debug('server.http.endpoint/json/version');
            res.json({
                Browser: 'Safari/RemoteDebug iOS Webkit Adapter',
                'Protocol-Version': '1.2',
                'User-Agent':
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2926.0 Safari/537.36',
                'WebKit-Version': '537.36 (@da59d418f54604ba2451cd0ef3a9cd42c05ca530)',
            });
        });

        this.app.get('/json/protocol', (_req, res) => {
            debug('server.http.endpoint/json/protocol');
            res.json();
        });
    }

    private onWSSConnection(socket: ws.WebSocket, req: http.IncomingMessage): void {
        debug('server.ws.onWSSConnection', req.url);

        const url = req.url;
        if (!url) {
            debug(`url cannot be found in req: ${req}`);
            return;
        }

        try {
            // TODO: need to check which socket is closed?
            this.adapter?.on('socketClosed', _id => {
                socket.close();
            });

            this.adapter?.connectToTarget(url, socket);
        } catch (err) {
            debug(`server.onWSSConnection.connectTo.error.${err}`);
        }

        (socket as EventEmitter).on('message', msg => {
            this.adapter?.forwardTo(url, msg);
        });
    }
}

function getWebkitDebugProxyPath(): string | undefined {
    debug(`getProxyPath`);
    if (os.platform() === 'win32') {
        const proxy = process.env.SCOOP
            ? path.resolve(
                __dirname,
                process.env.SCOOP + '/apps/ios-webkit-debug-proxy/current/ios_webkit_debug_proxy.exe',
            )
            : path.resolve(
                __dirname,
                process.env.USERPROFILE +
                '/scoop/apps/ios-webkit-debug-proxy/current/ios_webkit_debug_proxy.exe',
            );
        try {
            fs.statSync(proxy);
            return proxy;
        } catch (err) {
            console.error('ios_webkit_debug_proxy.exe not found. Please install "scoop install ios-webkit-debug-proxy"');
        }
    } else if (os.platform() === 'darwin' || os.platform() === 'linux') {
        try {
            return which.sync('ios_webkit_debug_proxy');
        } catch (err) {
            console.error('ios_webkit_debug_proxy not found. Please install ios_webkit_debug_proxy (https://github.com/google/ios-webkit-debug-proxy)');
        }
    }
}