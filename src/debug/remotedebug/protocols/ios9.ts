//
// Copyright (C) Microsoft. All rights reserved.
//

import { IOSProtocol } from './ios';
import { Target } from '../target';

export class IOS9Protocol extends IOSProtocol {

    constructor(target: Target) {
        super(target);
    }
}
