//
// Copyright (C) Microsoft. All rights reserved.
//

import * as request from 'request';
import * as http from 'http';
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { ITarget, IAdapterOptions } from './adapterInterfaces';
import { Logger, debug } from './logger';
import { Target } from './target';

export class Adapter extends EventEmitter {
    protected _id: string;
    protected _adapterType: string;
    protected _proxyUrl: string;
    protected _options: IAdapterOptions;
    protected _url: string;
    protected _proxyProc: ChildProcess;
    protected _targetMap: Map<string, Target>;
    protected _targetIdToTargetDataMap: Map<string, ITarget>;

    constructor(
        id: string,
        socket: string,
        options: IAdapterOptions,
        protected targetFactory: (targetId: string, targetData: ITarget) => Target,
        protected targetsDetailsOverride?: () => ITarget[],
    ) {
        super();

        this._id = id;
        this._proxyUrl = socket;
        this._targetMap = new Map<string, Target>();
        this._targetIdToTargetDataMap = new Map<string, ITarget>();

        // Apply default options
        options.pollingInterval = options.pollingInterval || 3000;
        options.baseUrl = options.baseUrl || 'http://127.0.0.1';
        options.path = options.path || '/json';
        options.port = options.port || 9222;
        this._options = options;

        this._url = `${this._options.baseUrl}:${this._options.port}${this._options.path}`;

        const index = this._id.indexOf('/', 1);
        if (index >= 0) {
            this._adapterType = '_' + this._id.substr(1, index - 1);
        } else {
            this._adapterType = this._id.replace('/', '_');
        }
    }

    public get id(): string {
        debug(`adapter.id`);
        return this._id;
    }

    public async start(): Promise<any> {
        debug(`adapter.start`, this._options);

        if (!this._options.proxyExePath) {
            debug(`adapter.start: Skip spawnProcess, no proxyExePath available`);
            return Promise.resolve(`skipped`);
        }

        const args = this._options.proxyExeArgsProvider();
        return this.spawnProcess(this._options.proxyExePath, args);
    }

    public stop(): void {
        debug(`adapter.stop`);
        if (this._proxyProc) {
            // Terminate the proxy process
            this._proxyProc.kill('SIGTERM');
            this._proxyProc = null;
        }
    }

    public getTargets(metadata?: any): Promise<ITarget[]> {
        debug(`adapter.getTargets, metadata=${metadata}`);
        return new Promise((resolve, reject) => {
            if (this.targetsDetailsOverride) {
                const targets = this.targetsDetailsOverride();
                const enhancedTargets = targets.map(t => this.setTargetInfo(t, metadata));
                resolve(targets);
            } else {
                request(this._url, (error: any, response: http.IncomingMessage, body: any) => {
                    if (error) {
                        resolve([]);
                        return;
                    }

                    const targets: ITarget[] = [];
                    const rawTargets: ITarget[] = JSON.parse(body);
                    rawTargets.forEach((t: ITarget) => {
                        targets.push(this.setTargetInfo(t, metadata));
                    });

                    resolve(targets);
                });
            }
        }).then((foundTargets: ITarget[]) => {
            // Now get the targets for each device adapter in our list
            const foundTargetIds = new Set(foundTargets.map(t => t.id));
            const currentlyKnownTargets = this._targetMap.values();
            for (const target of currentlyKnownTargets) {
                const id = target.data.id;
                if (!foundTargetIds.has(id)) {
                    // Unknown target, kill it
                    target.kill();
                    this._targetIdToTargetDataMap.delete(id);
                    this._targetMap.delete(id);
                }
            }
            return foundTargets;
        });
    }

    public connectTo(targetId: string, wsFrom: WebSocket): Target {
        debug(`adapter.connectTo, targetId=${targetId}`);
        if (!this._targetIdToTargetDataMap.has(targetId)) {
            Logger.error(`No endpoint url found for id ${targetId}`);
            return null;
        } else if (this._targetMap.has(targetId)) {
            debug(`Existing target found for id ${targetId}`);
            const existingTarget = this._targetMap.get(targetId);
            existingTarget.updateClient(wsFrom);
            return existingTarget;
        }

        const targetData = this._targetIdToTargetDataMap.get(targetId);
        const target = this.targetFactory(targetId, targetData);
        target.connectTo(targetData.webSocketDebuggerUrl, wsFrom);

        // When the VS Code -> remotedebug-ios-webkit-adapter socket is closed,
        // kill the Adapter.
        wsFrom.on('close', code => {
            target.callTarget('Debugger.disable', {}).then(() => {
                target.kill();
                this.emit('socketClosed', code);
            });
        });

        // Store the tools websocket for this target
        this._targetMap.set(targetId, target);

        // When the remotedebug-ios-webkit-adapter -> iOS device socket is closed,
        // kill the Adapter.
        target.on('socketClosed', id => {
            this.emit('socketClosed', id);
        });

        return target;
    }

    public forwardTo(targetId: string, message: string): void {
        debug(`adapter.forwardTo, targetId=${targetId}`);
        if (!this._targetMap.has(targetId)) {
            Logger.error(`No target found for id ${targetId}`);
            return;
        }

        this._targetMap.get(targetId).forward(message);
    }

    public forceRefresh() {
        debug('adapter.forceRefresh');
        if (this._proxyProc && this._options.proxyExePath && this._options.proxyExeArgsProvider) {
            const child = this._proxyProc;
            this._proxyProc = undefined;
            this.refreshProcess(child, this._options.proxyExePath, this._options.proxyExeArgsProvider());
        }
    }

    protected setTargetInfo(t: ITarget, metadata?: any): ITarget {
        debug('adapter.setTargetInfo', t, metadata);

        // Ensure there is a valid id
        const id: string = t.id || t.webSocketDebuggerUrl;
        t.id = id;

        // Set the adapter type
        t.adapterType = this._adapterType;
        t.type = t.type || 'javascript';

        // Append the metadata
        t.metadata = metadata;

        // Store the real endpoint
        const targetData = JSON.parse(JSON.stringify(t));
        this._targetIdToTargetDataMap.set(t.id, targetData);

        // Overwrite the real endpoint with the url of our proxy multiplexor
        t.webSocketDebuggerUrl = `${this._proxyUrl}${this._id}/${t.id}`;

        //let wsUrl = `${this._proxyUrl.replace('ws://', '')}${this._id}/${t.id}`;
        //t.devtoolsFrontendUrl = `https://chrome-devtools-frontend.appspot.com/serve_file/@fcea73228632975e052eb90fcf6cd1752d3b42b4/inspector.html?experiments=true&remoteFrontend=screencast&ws=${wsUrl}`;

        return t;
    }

    timeout(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    childParameters?: { path: string; args: string[]; };
    protected async refreshProcess(child: ChildProcess, path: string, args: string[]) {
        debug('adapter.refreshProcess');
        child.kill('SIGTERM');
        const childParameters = { path, args };
        this.childParameters = childParameters;
        await this.timeout(3000);
        if (this.childParameters !== childParameters) {
            // Means we scheduled a different spawn already
            return;
        }
        this.spawnProcess(path, args);
    }

    protected spawnProcess(path: string, args: string[]): Promise<ChildProcess> {
        debug(`adapter.spawnProcess, path=${path}`);

        return new Promise((resolve, reject) => {
            if (this._proxyProc) {
                reject('adapter.spawnProcess.error, err=process already started');
            }

            const child = spawn(path, args, {
                detached: false,
                stdio: ['ignore'],
            });
            this._proxyProc = child;

            child.on('error', err => {
                debug(`adapter.spawnProcess.error, err=${err}`);
                reject(`adapter.spawnProcess.error, err=${err}`);
            });

            child.on('close', code => {
                debug(`adapter.spawnProcess.close, code=${code}`);
                reject(`adapter.spawnProcess.close, code=${code}`);
            });

            child.stdout.on('data', data => {
                debug(`adapter.spawnProcess.stdout, data=${data.toString()}`);
            });

            child.stderr.on('data', data => {
                debug(`adapter.spawnProcess.stderr, data=${data.toString()}`);
            });

            setTimeout(() => {
                resolve(child);
            }, 200);
        });
    }
}
