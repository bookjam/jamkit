//
// Copyright (C) Microsoft. All rights reserved.
//

import * as request from 'request';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as WebSocket from 'ws';
import * as which from 'which';
import { debug } from './remotedebug/logger';
import { Adapter } from './remotedebug/adapter';
import { Target } from './remotedebug/target';
import { ITarget, IDeviceTarget } from './remotedebug/adapterInterfaces';
import { IOSProtocol } from './remotedebug/protocols/ios';
import { IOS8Protocol } from './remotedebug/protocols/ios8';
import { IOS9Protocol } from './remotedebug/protocols/ios9';
import { IOS12Protocol } from './remotedebug/protocols/ios12';
import { exec, spawn, ChildProcess } from 'child_process';

export class IOSAdapter extends Adapter {
    private _protocolMap = new Map<Target, IOSProtocol>();
    private _adapters = new Map<string, Adapter>();

    private _simulatorSocketFinder = new SimulatorSocketFinder();
    private _proxyExePath?: string;
    private _proxyExeArgsProvider: () => string[];
    private _proxyProc?: ChildProcess;

    constructor(port: number) {
        const proxyPort = port + 100;

        super(
            '/ios',
            `ws://localhost:${port}`,
            { port: proxyPort }
        );

        this._proxyExePath = getProxyPath();
        this._proxyExeArgsProvider = () => {
            const proxyArgs = [
                '--no-frontend',
                '--config=null:' + proxyPort + ',:' + (proxyPort + 1) + '-' + (proxyPort + 101),
            ];

            const socketStrings = this._simulatorSocketFinder.getKnownSockets();
            if (socketStrings.length > 0) {
                const combinedSocketString = socketStrings.map(s => `unix:${s}`).join(',');
                proxyArgs.push('-s');
                proxyArgs.push(combinedSocketString);
            }

            return proxyArgs;
        };
    }

    public start(): Promise<any> {
        debug(`iOSAdapter.start`);

        this._simulatorSocketFinder.start();
        this._simulatorSocketFinder.onSocketsChanged(() => this.forceRefresh());

        if (!this._proxyExePath) {
            debug(`adapter.start: Skip spawnProcess, no proxyExePath available`);
            return Promise.resolve(`skipped`);
        }

        const args = this._proxyExeArgsProvider();
        return this.spawnProcess(this._proxyExePath, args);
    }

    public stop(): void {
        this._simulatorSocketFinder.stop();

        if (this._proxyProc) {
            // Terminate the proxy process
            this._proxyProc.kill('SIGTERM');
            this._proxyProc = undefined;
        }
    }

    public forceRefresh() {
        debug(`iosAdapter.forceRefresh`);

        if (this._proxyProc && this._proxyExePath) {
            const child = this._proxyProc;
            this._proxyProc = undefined;
            this.refreshProcess(child, this._proxyExePath, this._proxyExeArgsProvider());
        }
    }

    childParameters?: { path: string; args: string[]; };
    private async refreshProcess(child: ChildProcess, path: string, args: string[]) {
        debug('adapter.refreshProcess');
        child.kill('SIGTERM');
        const childParameters = { path, args };
        this.childParameters = childParameters;
        await timeout(3000);
        if (this.childParameters !== childParameters) {
            // Means we scheduled a different spawn already
            return;
        }
        this.spawnProcess(path, args);
    }

    private spawnProcess(path: string, args: string[]): Promise<ChildProcess> {
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

            child.stdout?.on('data', data => {
                debug(`adapter.spawnProcess.stdout, data=${data.toString()}`);
            });

            child.stderr?.on('data', data => {
                debug(`adapter.spawnProcess.stderr, data=${data.toString()}`);
            });

            setTimeout(() => resolve(child), 200);
        });
    }

    /// getTargets - original iosAdapter.ts
    public getTargets(): Promise<ITarget[]> {
        debug(`iOSAdapter.getTargets`);

        return new Promise<ITarget[]>(resolve => {
            request(this._url, (error: any, _res: http.IncomingMessage, body: any) => {
                if (error) {
                    resolve([]);
                    return;
                }

                const devices: IDeviceTarget[] = JSON.parse(body);
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
                    const adapterId = `${this._id}_${d.deviceId}`;

                    if (!this._adapters.has(adapterId)) {
                        const parts = d.url.split(':');
                        if (parts.length > 1) {
                            // Get the port that the ios proxy exe is forwarding for this device
                            const port = parseInt(parts[1], 10);

                            // Create a new adapter for this device and add it to our list
                            const adapter = new Adapter(adapterId, this._proxyUrl, { port: port });
                            adapter.on('socketClosed', id => {
                                this.emit('socketClosed', id);
                                this._adapters.delete(adapterId);
                            });
                            this._adapters.set(adapterId, adapter);
                        }
                    }
                });

                // Now get the targets for each device adapter in our list
                const promises: Promise<ITarget[]>[] = [];

                let index = 0;
                this._adapters.forEach(adapter => {
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
            let target: Target | null = null;
            const adapter = this._adapters.get(id.adapterId);
            if (adapter) {
                target = adapter.connectTo(id.targetId, wsFrom);
            }
            return target;
        })();

        if (target) {
            if (!this._protocolMap.has(target)) {
                const version = (target.data.metadata as IDeviceTarget).version;
                const protocol = this.getProtocolFor(version, target);
                this._protocolMap.set(target, protocol);
            }
        }
    }

    public forwardTo(url: string, message: string): void {
        debug(`iosAdapter.forwardTo, url=${url}`);
        const id = this.getWebSocketId(url);
        this._adapters.get(id.adapterId)?.forwardTo(id.targetId, message);
    }

    private getWebSocketId(url: string): { adapterId: string; targetId: string; } {
        debug(`iosAdapter.getWebSocketId, url=${url}`);
        const index = url.indexOf('/', 1);
        const adapterId = url.substr(0, index);
        const targetId = url.substr(index + 1);

        return { adapterId: adapterId, targetId: targetId };
    }

    private getProtocolFor(version: string, target: Target): IOSProtocol {
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

function getProxyPath(): string | undefined {
    debug(`iOSAdapter.getProxyPath`);
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
        exec('lsof -U -F | grep com.apple.webinspectord_sim.socket | uniq', (error, stdout, stderr) => {
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
