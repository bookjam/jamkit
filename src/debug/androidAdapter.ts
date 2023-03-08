import { Socket as TcpSocket } from 'net';
import * as WebSocket from 'ws';
import { ITarget } from './remotedebug/adapterInterfaces';
import { EventEmitter } from 'events';

interface Message {
    type: string;
    targets?: string[];
    payload?: object;
}

export class AndroidAdapter extends EventEmitter {

    private socket = new TcpSocket();
    private buffer = new Uint8Array();
    private targets: ITarget[] = [];

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
        return Promise.resolve(this.targets);
    }

    public connectToTarget(url: string, wsFrom: WebSocket) {
    }

    public forwardTo(url: string, message: string): void {
    }

    //'{"type":"relay-debugger-message","target":"xxx","payload":{}}';

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
                this.targets = message.targets.map(target => {
                    return {
                        devtoolsFrontendUrl: "",
                        faviconUrl: "",
                        thumbnailUrl: "/thumb/",
                        title: target,
                        url: '',
                        webSocketDebuggerUrl: `ws://localhost:9010/android/${target}`,
                        appId: 'a-fake-app-id',
                        id: target,
                        adapterType: 'android',
                        type: 'javascript',
                        description: `a fake description for ${target}`,
                        metadata: {
                            deviceId: 'a-fake-android-device-id',
                            deviceName: 'Android',
                            deviceOSVersion: 'Android 999',
                            url: 'I might have to fill it properly later...',
                            version: '9.3.0',
                        }
                    };/**/

                    /*return {
                        "devtoolsFrontendUrl": "",
                        "faviconUrl": "",
                        "thumbnailUrl": "/thumb/",
                        "title": "catalog_main.js - MainApp :: com.yourdomain.b77cdb8f-d006-4f45-8af9-1b4c5f7140ed",
                        "url": "",
                        //"webSocketDebuggerUrl": "ws://localhost:9010/ios_SIMULATOR/ws://127.0.0.1:9111/devtools/page/1",
                        "webSocketDebuggerUrl": "ws://127.0.0.1:9111/devtools/page/1",
                        "appId": "---PID:31585",
                        "id": "---ws://127.0.0.1:9111/devtools/page/1",
                        "adapterType": "----_ios_SIMULATOR",
                        "type": "javascript",
                        "description": "",
                        "metadata": {
                            "deviceId": "---SIMULATOR",
                            "deviceName": "---SIMULATOR",
                            "deviceOSVersion": "---0.0.0",
                            "url": "---127.0.0.1:9111",
                            "version": "---9.3.0"
                        }
                    };/**/
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