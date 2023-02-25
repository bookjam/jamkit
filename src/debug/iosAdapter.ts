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
import { IOSTarget } from './remotedebug/protocols/iosTarget';
import { AdapterCollection } from './remotedebug/adapterCollection';
import { ITarget, IDeviceTarget, IAdapterOptions } from './remotedebug/adapterInterfaces';
import { IOSProtocol } from './remotedebug/protocols/ios/ios';
import { IOS8Protocol } from './remotedebug/protocols/ios/ios8';
import { IOS9Protocol } from './remotedebug/protocols/ios/ios9';
import { IOS12Protocol } from './remotedebug/protocols/ios/ios12';
import { exec } from 'child_process';

export class IOSAdapter extends AdapterCollection<IOSTarget> {
    private _protocolMap: Map<IOSTarget, IOSProtocol>;
    private _simulatorSocketFinder: SimulatorSocketFinder;

    constructor(port: number) {
        const simulatorSocketFinder = new SimulatorSocketFinder();

        super(
            '/ios',
            `ws://localhost:${port}`,
            getIOSAdapterOptions(port, simulatorSocketFinder),
            (targetId, targetData) => new IOSTarget(targetId, targetData),
        );

        this._protocolMap = new Map<IOSTarget, IOSProtocol>();
        this._simulatorSocketFinder = simulatorSocketFinder;
    }

    public start(): Promise<any> {
        debug(`iOSAdapter.start`);

        this._simulatorSocketFinder.start();
        this._simulatorSocketFinder.onSocketsChanged(() => this.forceRefresh());

        return super.start();
    }

    public stop(): void {
        this._simulatorSocketFinder.stop();
        super.stop();
    }

    public getTargets(): Promise<ITarget[]> {
        debug(`iOSAdapter.getTargets`);

        return new Promise(resolve => {
            request(this._url, (error: any, response: http.IncomingMessage, body: any) => {
                if (error) {
                    resolve([]);
                    return;
                }

                const devices: IDeviceTarget[] = JSON.parse(body);
                resolve(devices);
            });
        })
            .then((devices: IDeviceTarget[]) => {
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
                return Promise.resolve(devices);
            })
            .then((devices: IDeviceTarget[]) => {
                // Now start up all the adapters
                devices.forEach(d => {
                    const adapterId = `${this._id}_${d.deviceId}`;

                    if (!this._adapters.has(adapterId)) {
                        const parts = d.url.split(':');
                        if (parts.length > 1) {
                            // Get the port that the ios proxy exe is forwarding for this device
                            const port = parseInt(parts[1], 10);

                            // Create a new adapter for this device and add it to our list
                            const adapter = new Adapter(adapterId, this._proxyUrl, { port: port }, this.targetFactory);
                            adapter.start();
                            adapter.on('socketClosed', id => {
                                this.emit('socketClosed', id);
                                adapter.stop();
                                this._adapters.delete(adapterId);
                            });
                            this._adapters.set(adapterId, adapter);
                        }
                    }
                });
                return Promise.resolve(devices);
            })
            .then((devices: IDeviceTarget[]) => {
                // Now get the targets for each device adapter in our list
                return super.getTargets(devices);
            });
    }

    public connectTo(url: string, wsFrom: WebSocket): IOSTarget | undefined {
        const target = super.connectTo(url, wsFrom);

        if (!target) {
            return undefined;
        }

        if (!this._protocolMap.has(target)) {
            const version = (target.data.metadata as IDeviceTarget).version;
            const protocol = this.getProtocolFor(version, target);
            this._protocolMap.set(target, protocol);
        }
        return target;
    }

    private getProtocolFor(version: string, target: IOSTarget): IOSProtocol {
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

function getIOSAdapterOptions(port: number, simulatorSocketFinder: SimulatorSocketFinder): IAdapterOptions {
    const proxyPort = port + 100;
    const proxyExeArgsProvider = () => {
        const proxyArgs = [
            '--no-frontend',
            '--config=null:' + proxyPort + ',:' + (proxyPort + 1) + '-' + (proxyPort + 101),
        ];

        const socketStrings = simulatorSocketFinder.listKnownSockets();
        if (socketStrings.length > 0) {
            const combinedSocketString = socketStrings.map(s => `unix:${s}`).join(',');
            proxyArgs.push('-s');
            proxyArgs.push(combinedSocketString);
        }

        return proxyArgs;
    };
    const proxyPath = getProxyPath();

    return {
        port: proxyPort,
        proxyExePath: proxyPath ?? undefined,
        proxyExeArgsProvider: proxyExeArgsProvider,
    };
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

    public listKnownSockets(): string[] {
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
