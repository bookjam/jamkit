import { Socket as TcpSocket } from 'net';
import * as WebSocket from 'ws';
import { ITarget } from './remotedebug/adapterInterfaces';
import { EventEmitter } from 'events';
import { Target } from './remotedebug/target';
import { IOS9Protocol } from './remotedebug/protocols/ios9';

interface Message {
    type: string;
    targets?: string[];
    payload?: object;
}

export class AndroidAdapter extends EventEmitter {

    private socket = new TcpSocket();
    private buffer = new Uint8Array();
    private targets = new Map<string, Target>();

    public start(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.socket.on('error', (error) => {
                console.error(`socket error: ${error}`);
                reject();
            });
            this.socket.connect(9876, '127.0.0.1', () => {
                this.socket.on('data', (data) => {
                    this.onSocketData(data);
                });
                this.sendMessage('{"type":"list-targets"}');

                // give some delay so that we can get the initial target list
                setTimeout(() => {
                    resolve(this.socket.address.toString());
                }, 2000);

            });
        });
    }

    public stop(): void {
        this.socket.end();
    }

    public forceRefresh() {
    }

    public getTargets(): Promise<ITarget[]> {
        return Promise.resolve([...this.targets.values()].map(target => target.data));
    }

    public connectToTarget(url: string, wsFrom: WebSocket) {
        const targetId = url.substring(9); // remove '/android/'
        const target = this.targets.get(targetId);
        if (target) {
            target.connectTo('', wsFrom);
        }
    }

    public forwardTo(url: string, message: string): void {
        const targetId = url.substring(9); // remove '/android/'
        const target = this.targets.get(targetId);
        if (target) {
            target.relayMessageFromTarget(message);
        }
    }

    private relayMessageToTarget(targetId: string, message: string) {
        this.sendMessage(
            `{
                "type": "relay-protocol-message",
                "target": "${targetId}",
                "payload": ${message}
            }`
        );
    }

    private sendMessage(message: string): void {

        const encoder = new TextEncoder();
        const payloadBytes = encoder.encode(message);

        const headerBytes = new Uint8Array(4);
        writeUint32(headerBytes, payloadBytes.length);

        if (!this.socket.write(headerBytes) || !this.socket.write(payloadBytes)) {
            // handle error here
        }
    }

    private onSocketData(data: Buffer): void {
        if (this.buffer.byteLength == 0) {
            this.buffer = data;
        }
        else {
            const newBuffer = new Uint8Array(this.buffer.length + data.length);
            newBuffer.set(this.buffer, 0);
            newBuffer.set(data, this.buffer.length);
            this.buffer = newBuffer;
        }
        this.processInput();
    }

    private processInput(): void {
        while (this.buffer.length >= 4) {

            const size = readUint32(this.buffer);
            if (size > this.buffer.length - 4) {
                // Not enough data yet
                return;
            }

            const decoder = new TextDecoder('utf-8');
            const json = decoder.decode(this.buffer.subarray(4, 4 + size));

            const message: Message = JSON.parse(json);

            if (message.type === 'update-targets' && message.targets) {

                const oldTargetIds = [...this.targets.keys()];
                const newTargetIds = message.targets;

                const removedTargetIds = oldTargetIds.filter(targetId => !newTargetIds.includes(targetId));
                const addedTargetIds = newTargetIds.filter(targetId => !oldTargetIds.includes(targetId));

                removedTargetIds.forEach(targetId => this.targets.delete(targetId));
                addedTargetIds.forEach(targetId => {

                    const targetData: ITarget = {
                        //devtoolsFrontendUrl: "",
                        //faviconUrl: "",
                        //thumbnailUrl: "/thumb/",
                        title: targetId,
                        url: '',
                        webSocketDebuggerUrl: `ws://localhost:9010/android/${targetId}`,
                        appId: 'a-fake-app-id',
                        id: targetId,
                        adapterType: 'android',
                        type: 'javascript',
                        description: `a fake description for ${targetId}`,
                        metadata: {
                            deviceId: 'a-fake-android-device-id',
                            deviceName: 'Android',
                            deviceOSVersion: 'Android 999',
                            url: 'I might have to fill it properly later...',
                            version: '9.3.0',
                        }
                    };

                    const target = new Target(targetId, targetData, (targetId, message) => {
                        this.relayMessageToTarget(targetId, message);
                    });

                    new IOS9Protocol(target); // apply the protocol

                    this.targets.set(targetId, target);
                });
            }

            console.log(`From Android: ${message}`);

            this.buffer = this.buffer.subarray(size + 4);
        }
    }
}

function readUint32(bytes: Uint8Array): number {
    return (bytes[0] << 24) + (bytes[1] << 16) + (bytes[1] << 8) + bytes[3];
}

function writeUint32(bytes: Uint8Array, length: number): void {
    bytes[0] = (length >> 24) & 0xff;
    bytes[1] = (length >> 16) & 0xff;
    bytes[2] = (length >> 8) & 0xff;
    bytes[3] = (length >> 0) & 0xff;
}