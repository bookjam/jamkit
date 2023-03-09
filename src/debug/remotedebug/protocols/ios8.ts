//
// Copyright (C) Microsoft. All rights reserved.
//

import { IOSProtocol } from './ios';
import { TargetAdapter } from '../targetAdapter';
import { Logger } from '../logger';

export class IOS8Protocol extends IOSProtocol {

    constructor(target: TargetAdapter) {
        super(target);

        this._target.addMessageFilter('target::error', (msg) => {
            Logger.error('Error received (overriding) ' + JSON.stringify(msg));
            msg = {
                id: msg.id,
                result: {}
            };

            return Promise.resolve(msg);
        });
    }
}
