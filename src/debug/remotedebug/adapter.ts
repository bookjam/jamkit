//
// Copyright (C) Microsoft. All rights reserved.
//

import * as request from 'request';
import * as http from 'http';
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { ITarget, IAdapterOptions } from './adapterInterfaces';
import { Logger, debug } from './logger';
import { Target } from './target';


export class Adapter extends EventEmitter {
    protected _id: string;
    protected _adapterType: string;
    protected _proxyUrl: string;
    protected _options: IAdapterOptions;
    protected _url: string;
    protected _targetMap: Map<string, Target>;
    protected _targetIdToTargetDataMap: Map<string, ITarget>;

    constructor(
        id: string,
        socket: string,
        options: IAdapterOptions
    ) {
        super();

        this._id = id;
        this._proxyUrl = socket;
        this._targetMap = new Map<string, Target>();
        this._targetIdToTargetDataMap = new Map<string, ITarget>();

        // Apply default options
        options.path = options.path || '/json';
        options.port = options.port || 9222;
        this._options = options;

        this._url = `http://127.0.0.1:${this._options.port}${this._options.path}`;

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

    public getTargets(metadata?: any): Promise<ITarget[]> {
        debug(`adapter.getTargets, metadata=${metadata}`);
        return new Promise((resolve, reject) => {
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
        }).then((foundTargets: ITarget[]) => {
            // Now get the targets for each device adapter in our list
            const foundTargetIds = new Set(foundTargets.map(t => t.id));
            this._targetMap.forEach(target => {
                const id = target.data.id;
                if (!foundTargetIds.has(id)) {
                    // Unknown target, kill it
                    target.kill();
                    this._targetIdToTargetDataMap.delete(id);
                    this._targetMap.delete(id);
                }
            });
            return foundTargets;
        });
    }

    public connectTo(targetId: string, wsFrom: WebSocket): Target | null {
        debug(`adapter.connectTo, targetId=${targetId}`);
        if (!this._targetIdToTargetDataMap.has(targetId)) {
            Logger.error(`No endpoint url found for id ${targetId}`);
            return null;
        }

        if (this._targetMap.has(targetId)) {
            debug(`Existing target found for id ${targetId}`);
            const existingTarget = this._targetMap.get(targetId);
            existingTarget.updateClient(wsFrom);
            return existingTarget;
        }

        const targetData = this._targetIdToTargetDataMap.get(targetId);
        const target = new Target(targetId, targetData);
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
}

