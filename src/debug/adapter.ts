//
// Copyright (C) Microsoft. All rights reserved.
//

import * as request from 'request';
import * as http from 'http';
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { ITarget, IDevice } from './remotedebug/adapterInterfaces';
import { Logger, debug } from './remotedebug/logger';
import { TargetAdapter } from './remotedebug/targetAdapter';


export class Adapter extends EventEmitter {
    protected _id: string;
    protected _adapterType: string;
    protected _proxyUrl: string;
    protected _url: string;
    protected _targetMap = new Map<string, TargetAdapter>();
    protected _targetIdToTargetDataMap = new Map<string, ITarget>();

    constructor(
        id: string,
        proxyUrl: string,
        port: number
    ) {
        super();

        this._id = id;
        this._proxyUrl = proxyUrl;

        this._url = `http://127.0.0.1:${port}/json`;

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

    public getTargets(device: IDevice): Promise<ITarget[]> {
        debug(`adapter.getTargets, device=${device}`);
        return new Promise<ITarget[]>(resolve => {
            request(this._url, (error: any, _response: http.IncomingMessage, body: any) => {
                if (error) {
                    resolve([]);
                    return;
                }

                const targets: ITarget[] = [];
                (JSON.parse(body) as ITarget[]).forEach(target => {
                    this.fixTargetInfo(target, device);
                    targets.push(target);
                });

                // Now get the targets for each device adapter in our list
                const foundTargetIds = new Set(targets.map(t => t.id));
                this._targetMap.forEach(target => {
                    const id = target.data.id;
                    if (!foundTargetIds.has(id)) {
                        // Unknown target, kill it
                        target.kill();
                        this._targetIdToTargetDataMap.delete(id);
                        this._targetMap.delete(id);
                    }
                });

                resolve(targets);
            });
        });
    }

    public connectTo(targetId: string, wsFrom: WebSocket): TargetAdapter | null {
        debug(`adapter.connectTo, targetId=${targetId}`);
        const targetData = this._targetIdToTargetDataMap.get(targetId);
        if (!targetData) {
            Logger.error(`No endpoint url found for id ${targetId}`);
            return null;
        }

        const existingTarget = this._targetMap.get(targetId);
        if (existingTarget) {
            debug(`Existing target found for id ${targetId}`);
            existingTarget.updateClient(wsFrom);
            return existingTarget;
        }

        const target = new TargetAdapter(targetId, targetData);
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

        this._targetMap.get(targetId)?.forwardFromToolsToTarget(message);
    }

    private fixTargetInfo(t: ITarget, device: IDevice): void {
        debug('adapter.setTargetInfo', t, device);

        // Ensure there is a valid id
        const id: string = t.id || t.webSocketDebuggerUrl;
        t.id = id;

        // Set the adapter type
        t.adapterType = this._adapterType;
        t.type = t.type || 'javascript';

        // Append the device as metadata
        t.metadata = device;

        // Store the real endpoint
        const targetData = JSON.parse(JSON.stringify(t));
        this._targetIdToTargetDataMap.set(t.id, targetData);

        // Overwrite the real endpoint with the url of our proxy multiplexor
        t.webSocketDebuggerUrl = `${this._proxyUrl}${this._id}/${t.id}`;
    }
}

