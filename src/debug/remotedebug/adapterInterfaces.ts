//
// Copyright (C) Microsoft. All rights reserved.
//

export interface IDevice {
    deviceId: string;
    deviceName: string;
    deviceOSVersion: string;
    url: string;
    version: string;
}
export interface ITarget {
    appId?: string;
    description: string;
    id: string;
    title: string;
    type: string;
    url: string;
    webSocketDebuggerUrl: string;
    adapterType: string;
    metadata?: IDevice;
}

export interface IAdapterOptions {
    path?: string;
    port?: number;
}
