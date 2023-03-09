//
// Copyright (C) Microsoft. All rights reserved.
//

import * as request from 'request';
import * as http from 'http';
import * as WebSocket from 'ws';
import { debug } from './remotedebug/logger';
import { EventEmitter } from 'events';
import { Adapter } from './adapter';
import { TargetAdapter } from './remotedebug/targetAdapter';
import { ITarget, IDevice } from './remotedebug/adapterInterfaces';
import { IOSProtocol } from './remotedebug/protocols/ios';
import { IOS8Protocol } from './remotedebug/protocols/ios8';
import { IOS9Protocol } from './remotedebug/protocols/ios9';
import { IOS12Protocol } from './remotedebug/protocols/ios12';
import { exec, spawn, ChildProcess } from 'child_process';


export class IOSAdapter extends EventEmitter {
    private protocolMap = new Map<TargetAdapter, IOSProtocol>(); // FIXME: not needed?
    private adapters = new Map<string, Adapter>();

    private simulatorSocketFinder = new SimulatorSocketFinder();
    private proxyProc?: ChildProcess;
    private spawnToken: number = 0;

    constructor(private proxyExecPath: string, private proxyPort: number) {
        super();
    }

    public start(): Promise<any> {
        debug(`iOSAdapter.start`);

        this.simulatorSocketFinder.start();
        this.simulatorSocketFinder.onSocketsChanged(() => this.forceRefresh());

        return this.spawnProxyProcess();
    }

    public stop(): void {
        this.simulatorSocketFinder.stop();

        if (this.proxyProc) {
            // Terminate the proxy process
            this.proxyProc.kill('SIGTERM');
            this.proxyProc = undefined;
        }
    }

    public forceRefresh() {
        debug(`iosAdapter.forceRefresh`);

        if (this.proxyProc) {
            this.refreshProxy();
        }
    }

    private getProxyExecArgs(): string[] {
        const proxyArgs = [
            '--no-frontend',
            //'--config=null:' + this.proxyPort + ',:' + (this.proxyPort + 1) + '-' + (this.proxyPort + 101),
            `--config=null:${this.proxyPort},:${this.proxyPort + 1}-${this.proxyPort + 101}`,
        ];

        const socketStrings = this.simulatorSocketFinder.getKnownSockets();
        if (socketStrings.length > 0) {

            // FIXME: it doesn't work. the proxy accepts only 1 socket string
            const combinedSocketString = socketStrings.map(s => `unix:${s}`).join(',');
            proxyArgs.push('-s');
            proxyArgs.push(combinedSocketString);
        }

        return proxyArgs;
    }

    private async refreshProxy() {
        debug('adapter.refreshProxy');

        if (this.proxyProc) {
            const child = this.proxyProc;
            this.proxyProc = undefined;
            child.kill('SIGTERM');
        }

        const spawnToken = ++this.spawnToken;
        await timeout(3000);

        if (spawnToken !== this.spawnToken) {
            // Means we scheduled a different spawn already
            return;
        }

        this.spawnProxyProcess();
    }

    private spawnProxyProcess(): Promise<ChildProcess> {
        debug(`adapter.spawnProxyProcess`);
        return new Promise((resolve, reject) => {
            if (this.proxyProc) {
                reject('adapter.spawnProcess.error, err=process already started');
            }

            const child = spawn(this.proxyExecPath, this.getProxyExecArgs(), {
                detached: false,
                stdio: ['ignore'],
            });
            this.proxyProc = child;

            child.on('error', err => {
                debug(`adapter.spawnProcess.error, err=${err}`);
                reject(`adapter.spawnProcess.error, err=${err}`);
            });

            child.on('close', code => {
                debug(`adapter.spawnProcess.close, code=${code}`);
                reject(`adapter.spawnProcess.close, code=${code}`);
            });

            child.stdout?.on('data', data => {
                debug(`adapter.spawnProcess.stdout, data=${data.toString()}`);
            });

            child.stderr?.on('data', data => {
                debug(`adapter.spawnProcess.stderr, data=${data.toString()}`);
            });

            setTimeout(() => resolve(child), 200);
        });
    }

    public getTargets(): Promise<ITarget[]> {
        debug(`iOSAdapter.getTargets`);

        return new Promise<ITarget[]>(resolve => {
            const proxyUrl = `http://127.0.0.1:${this.proxyPort}/json`;
            request(proxyUrl, (error: any, _res: http.IncomingMessage, body: any) => {
                if (error) {
                    resolve([]);
                    return;
                }

                const devices: IDevice[] = JSON.parse(body);

                // Set device versions
                devices.forEach(d => {
                    if (d.deviceId.startsWith('SIMULATOR')) {
                        d.version = '9.3.0'; // TODO: Find a way to auto detect version. Currently hardcoding it.
                    } else if (d.deviceOSVersion) {
                        d.version = d.deviceOSVersion;
                    } else {
                        debug(
                            `error.iosAdapter.getTargets.getDeviceVersion.failed.fallback, device=${d}. ` +
                            'Please update ios-webkit-debug-proxy to version 1.8.5',
                        );
                        d.version = '9.3.0';
                    }
                });

                // Now start up all the adapters
                devices.forEach(d => {
                    const adapterId = `/ios_${d.deviceId}`;

                    if (!this.adapters.has(adapterId)) {
                        const parts = d.url.split(':');
                        if (parts.length > 1) {
                            // Get the port that the ios proxy exe is forwarding for this device
                            const port = parseInt(parts[1], 10);

                            // Create a new adapter for this device and add it to our list
                            const proxyUrl = `ws://localhost:${port}`; // ????
                            const adapter = new Adapter(adapterId, proxyUrl, port);
                            adapter.on('socketClosed', id => {
                                this.emit('socketClosed', id);
                                this.adapters.delete(adapterId);
                            });
                            this.adapters.set(adapterId, adapter);
                        }
                    }
                });

                // Now get the targets for each device adapter in our list
                const promises: Promise<ITarget[]>[] = [];

                let index = 0;
                this.adapters.forEach(adapter => {
                    promises.push(adapter.getTargets(devices[index++]));
                });

                Promise.all(promises).then((results: ITarget[][]) => {
                    let allTargets: ITarget[] = [];
                    results.forEach(targets => {
                        allTargets = allTargets.concat(targets);
                    });
                    resolve(allTargets);
                });
            });
        });
    }

    public connectToTarget(url: string, wsFrom: WebSocket) {
        debug(`iosAdapter.connectToTarget, url=${url}`);

        const target = (() => {
            const id = this.getWebSocketId(url);
            let target: TargetAdapter | null = null;
            const adapter = this.adapters.get(id.adapterId);
            if (adapter) {
                target = adapter.connectTo(id.targetId, wsFrom);
            }
            return target;
        })();

        if (target) {
            if (!this.protocolMap.has(target)) {
                const version = target.data.metadata.version;
                const protocol = this.getProtocolFor(version, target);
                this.protocolMap.set(target, protocol);
            }
        }
    }

    public forwardTo(url: string, message: string): void {
        debug(`iosAdapter.forwardTo, url=${url}`);
        const id = this.getWebSocketId(url);
        this.adapters.get(id.adapterId)?.forwardTo(id.targetId, message);
    }

    private getWebSocketId(url: string): { adapterId: string; targetId: string; } {
        debug(`iosAdapter.getWebSocketId, url=${url}`);
        const index = url.indexOf('/', 1);
        const adapterId = url.substr(0, index);
        const targetId = url.substr(index + 1);

        return { adapterId: adapterId, targetId: targetId };
    }

    private getProtocolFor(version: string, target: TargetAdapter): IOSProtocol {
        debug(`iOSAdapter.getProtocolFor`);
        const parts = version.split('.');
        if (parts.length > 0) {
            const major = parseInt(parts[0], 10);
            if (major <= 8) {
                return new IOS8Protocol(target);
            }
            const minor = parseInt(parts[1], 10);
            if (major > 12 || (major >= 12 && minor >= 2)) {
                return new IOS12Protocol(target);
            }
        }

        return new IOS9Protocol(target);
    }
}

function arraysEqual<T>(a: Array<T>, b: Array<T>) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const IOS_SIMULATOR_SOCKET_COMMAND = 'lsof -U -F | grep com.apple.webinspectord_sim.socket | uniq';

class SimulatorSocketFinder {
    private timer?: NodeJS.Timeout;
    private knownSockets: string[] = [];
    private socketsChangedCallback?: () => void;

    public onSocketsChanged(callback: () => void) {
        this.socketsChangedCallback = callback;
    }

    public start() {
        this.scheduleSimulatorCheck();
    }

    public stop() {
        clearTimeout(this.timer);
        this.timer = undefined;
    }

    public getKnownSockets(): string[] {
        return this.knownSockets;
    }

    private updateKnownSockets(knownSockets: string[]) {
        if (arraysEqual(this.knownSockets, knownSockets)) {
            return;
        }

        this.knownSockets = knownSockets;
        this.socketsChangedCallback?.();
    }

    private scheduleSimulatorCheck() {
        this.timer = setTimeout(() => {
            this.checkSimulatorSockets();
        }, 1000);
    }

    private checkSimulatorSockets() {
        exec(IOS_SIMULATOR_SOCKET_COMMAND, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return;
            }
            const sockets = stdout
                .split('\n')
                .filter(line => line.length > 1)
                .map(line => line.substring(1));

            const uniquedSockets = Array.from(new Set(sockets)).sort();
            this.updateKnownSockets(uniquedSockets);

            if (this.timer) {
                this.scheduleSimulatorCheck();
            }
        });
    }
}
