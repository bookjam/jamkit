import * as http from 'http';
import * as ws from 'ws';
import * as express from 'express';
import { IOSAdapter } from './iosAdapter';
import { debug } from './remotedebug/logger';
import { EventEmitter } from 'events';

export class DebuggingProxy {
    private app;
    private https: http.Server | null = null;
    private wss: ws.Server | null = null;
    private adapter: IOSAdapter | null = null;
    private targetFetchTimer: NodeJS.Timer | null = null;

    constructor() {
        this.app = express();
    }

    public async run(serverPort: number): Promise<number> {
        debug('server.run, port=%s', serverPort);

        this.https = http.createServer(this.app);

        this.wss = new ws.Server({ server: this.https });
        this.wss.on('connection', (a, req) => {
            this.onWSSConnection(a, req);
        });

        this.setupHttpHandlers();

        // Start server and return the port number
        this.https.listen(serverPort);
        const port = (this.https.address() as ws.AddressInfo).port;

        this.adapter = new IOSAdapter(port);

        return this.adapter
            .start()
            .then(() => {
                this.startTargetFetcher();
                return port;
            });
    }

    public stop(): void {
        debug('server.stop');

        if (this.https) {
            this.https.close();
            this.https = null;
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
                msg: 'Hello from RemoteDebug iOS WebKit Adapter',
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
            this.adapter?.on('socketClosed', _id => {
                socket.close();
            });
            this.adapter?.connectTo(url, socket);
        } catch (err) {
            debug(`server.onWSSConnection.connectTo.error.${err}`);
        }

        (socket as EventEmitter).on('message', msg => {
            this.adapter?.forwardTo(url, msg);
        });
    }
}