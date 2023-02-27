//
// Copyright (C) Microsoft. All rights reserved.
//

import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { ITarget } from './adapterInterfaces';

export interface AdapterTarget extends EventEmitter {
    data: ITarget;
    targetBased: boolean;
    targetId: string;

    // constructor(targetId: string, data?: ITarget): AdapterTarget;

    kill();

    connectTo(url: string, wsFrom: WebSocket): void;

    forward(message: string): void;

    updateClient(wsFrom: WebSocket): void;

    addMessageFilter(method: string, filter: (msg: any) => Promise<any>): void;

    callTarget(method: string, params: any): Promise<any>;

    fireEventToTools(method: string, params: any): void;

    fireResultToTools(id: number, params: any): void;

    replyWithEmpty(msg: any): Promise<any>;
}
