//
// Copyright (C) Microsoft. All rights reserved.
//

//import * as createDebug from 'debug';

class LoggerUtil {

    constructor() {
    }

    public log(msg: string): void {
        console.log.apply(this, Array.prototype.slice.call(arguments));
    }

    public error(msg: string): void {
        console.error(msg);
    }
}

//export const debug = createDebug('remotedebug');
export function debug(message?: any, ...optionalParams: any[]) {
    console.debug(message, ...optionalParams);
}
export const Logger = new LoggerUtil();
