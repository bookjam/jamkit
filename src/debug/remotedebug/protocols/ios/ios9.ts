//
// Copyright (C) Microsoft. All rights reserved.
//

import { IOSProtocol } from './ios';
import { IOSTarget } from '../iosTarget';
import { AdapterTarget } from '../target';

export class IOS9Protocol extends IOSProtocol {

    constructor(target: AdapterTarget) {
        super(target);
    }

    protected mapSelectorList (selectorList): void {
        const range = selectorList.range;

        for (let i = 0; i < selectorList.selectors.length; i++) {
            if (range !== undefined) {
                selectorList.selectors[i].range = range;
            }
        }

        delete selectorList.range;
    }
}
