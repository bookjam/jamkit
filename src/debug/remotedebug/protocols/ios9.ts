//
// Copyright (C) Microsoft. All rights reserved.
//

import { IOSProtocol } from './ios';
import { TargetAdapter } from '../targetAdapter';

export class IOS9Protocol extends IOSProtocol {

    constructor(target: TargetAdapter) {
        super(target);
    }
}
