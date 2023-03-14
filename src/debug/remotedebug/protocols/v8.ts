//
// Copyright (C) Microsoft. All rights reserved.
//

import { TargetAdapter } from '../targetAdapter';

export class V8Protocol {
    protected _adapter: TargetAdapter;

    protected _lastScriptEval: string;
    protected _lastPageExecutionContextId: number;

    protected runtimeEnabled: boolean = false;
    protected shouldDeferScriptParsed: boolean = true;
    protected deferredScriptParsedCalls: (() => void)[] = [];

    constructor(target: TargetAdapter) {
        this._adapter = target;

        this._adapter.addMessageFilter('tools::Runtime.evaluate', msg => this.onEvaluate(msg));
        this._adapter.addMessageFilter('target::Runtime.executionContextCreated', msg =>
            this.onExecutionContextCreated(msg),
        );

        this._adapter.addMessageFilter('target::Debugger.scriptParsed', msg => this.onScriptParsed(msg));
    }

    private onExecutionContextCreated(msg: any): Promise<any> {
        if (msg.params && msg.params.context) {
            if (!msg.params.context.origin) {
                msg.params.context.origin = msg.params.context.name;
            }

            if (msg.params.context.isPageContext) {
                this._lastPageExecutionContextId = msg.params.context.id;
            }

            if (msg.params.context.frameId) {
                msg.params.context.auxData = {
                    frameId: msg.params.context.frameId,
                    isDefault: true,
                };
                delete msg.params.context.frameId;
            }
        }

        return Promise.resolve(msg);
    }

    private onEvaluate(msg: any): Promise<any> {
        if (msg.result && msg.result.wasThrown) {
            msg.result.result.subtype = 'error';
            msg.result.exceptionDetails = {
                text: msg.result.result.description,
                url: '',
                scriptId: this._lastScriptEval,
                line: 1,
                column: 0,
                stack: {
                    callFrames: [
                        {
                            functionName: '',
                            scriptId: this._lastScriptEval,
                            url: '',
                            lineNumber: 1,
                            columnNumber: 1,
                        },
                    ],
                },
            };
        } else if (msg.result && msg.result.result && msg.result.result.preview) {
            msg.result.result.preview.description = msg.result.result.description;
            msg.result.result.preview.type = 'object';
        }

        return Promise.resolve(msg);
    }

    private onScriptParsed(msg: any): Promise<any> {
        this._lastScriptEval = msg.params.scriptId;
        return new Promise(resolve => {
            if (this.shouldDeferScriptParsed) {
                // We're sending the response after a delay, otherwise this seems to be sent
                // too early for VS Code to pick up the parsed sources
                this.deferredScriptParsedCalls.push(() => {
                    resolve(msg);
                });
                return;
            }

            resolve(msg);
        });
    }
}
