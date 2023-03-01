//
// Copyright (C) Microsoft. All rights reserved.
//

import { Target } from '../target';

export class IOSProtocol {
    protected _target: Target;

    protected _isEvaluating: boolean;
    protected _lastScriptEval: string;
    protected _lastNodeId: number;
    protected _lastPageExecutionContextId: number;

    protected runtimeEnabled: boolean = false;
    protected shouldDeferScriptParsed: boolean = true;
    protected deferredScriptParsedCalls: (() => void)[] = [];

    constructor(target: Target) {
        this._target = target;

        this._target.addMessageFilter('tools::Debugger.canSetScriptSource', msg => this.onCanSetScriptSource(msg));
        this._target.addMessageFilter('tools::Debugger.setBlackboxPatterns', msg => this.onSetBlackboxPatterns(msg));
        this._target.addMessageFilter('tools::Debugger.setAsyncCallStackDepth', msg =>
            this.onSetAsyncCallStackDepth(msg),
        );
        this._target.addMessageFilter('tools::Debugger.enable', msg => this.onDebuggerEnable(msg));
        this._target.addMessageFilter('target::Debugger.enable', msg => this.onDidDebuggerEnable(msg));
        this._target.addMessageFilter('target::Debugger.scriptParsed', msg => this.onScriptParsed(msg));

        this._target.addMessageFilter('tools::Log.clear', msg => {
            msg.method = 'Console.clearMessages';
            return Promise.resolve(msg);
        });
        this._target.addMessageFilter('tools::Log.disable', msg => {
            msg.method = 'Console.disable';
            return Promise.resolve(msg);
        });
        this._target.addMessageFilter('tools::Log.enable', msg => {
            msg.method = 'Console.enable';
            return Promise.resolve(msg);
        });
        this._target.addMessageFilter('target::Console.messageAdded', msg => this.onConsoleMessageAdded(msg));

        this._target.addMessageFilter('tools::Runtime.compileScript', msg => this.onRuntimeOnCompileScript(msg));
        this._target.addMessageFilter('target::Runtime.executionContextCreated', msg =>
            this.onExecutionContextCreated(msg),
        );
        this._target.addMessageFilter('tools::Runtime.enable', msg => this.onRuntimeEnable(msg));
        this._target.addMessageFilter('target::Runtime.enable', msg => this.onDidRuntimeEnable(msg));

        this._target.addMessageFilter('target::Runtime.runIfWaitingForDebugger', msg =>
            this.onTargetRunIfWaitingForDebugger(msg),
        );

        this._target.addMessageFilter('target::Runtime.evaluate', msg => this.onEvaluate(msg));
        this._target.addMessageFilter('target::Runtime.getProperties', msg => this.onRuntimeGetProperties(msg));
    }

    private onCanSetScriptSource(msg: any): Promise<any> {
        const result = {
            result: false,
        };

        this._target.fireResultToTools(msg.id, result);
        return Promise.resolve(null);
    }

    private onSetBlackboxPatterns(msg: any): Promise<any> {
        const result = {};

        this._target.fireResultToTools(msg.id, result);
        return Promise.resolve(null);
    }

    private onSetAsyncCallStackDepth(msg: any): Promise<any> {
        const result = {
            result: true,
        };

        this._target.fireResultToTools(msg.id, result);
        return Promise.resolve(null);
    }

    private onDebuggerEnable(msg: any): Promise<any> {
        this._target.callTarget('Debugger.setBreakpointsActive', { active: true });
        return Promise.resolve(msg);
    }

    private onDidDebuggerEnable(msg: any): Promise<any> {
        return Promise.resolve(msg);
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

    private onRuntimeOnCompileScript(msg: any): Promise<any> {
        const params = {
            expression: msg.params.expression,
            contextId: msg.params.executionContextId,
        };

        this._target.callTarget('Runtime.evaluate', params).then(obj => {
            const results = {
                scriptId: null,
                exceptionDetails: null,
            };
            this._target.fireResultToTools(msg.id, results);
        });

        return Promise.resolve(null);
    }

    private onRuntimeGetProperties(msg: any): Promise<any> {
        const newPropertyDescriptors = [];

        if (msg.result.result) {
            for (let i = 0; i < msg.result.result.length; i++) {
                if (msg.result.result[i].isOwn || msg.result.result[i].nativeGetter) {
                    msg.result.result[i].isOwn = true;
                    newPropertyDescriptors.push(msg.result.result[i]);
                }
            }
        }

        msg.result.result = null;
        msg.result.result = newPropertyDescriptors;

        return Promise.resolve(msg);
    }

    private onRuntimeEnable(msg: any): Promise<any> {
        return Promise.resolve(msg);
    }

    private onDidRuntimeEnable(msg: any): Promise<any> {
        this.runtimeEnabled = true;
        return Promise.resolve(msg);
    }

    private onTargetRunIfWaitingForDebugger(msg: any): Promise<any> {
        if (this.runtimeEnabled) {
            this.shouldDeferScriptParsed = false;
            this.deferredScriptParsedCalls.forEach(callback => {
                callback();
            });
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

    private onConsoleMessageAdded(msg: any): Promise<any> {
        let message = msg.params.message;
        let type;
        if (message.type === 'log') {
            switch (message.level) {
                case 'log':
                    type = 'log';
                    break;
                case 'info':
                    type = 'info';
                    break;
                case 'error':
                    type = 'error';
                    break;
                default:
                    type = 'log';
            }
        } else {
            type = message.type;
        }

        const consoleMessage = {
            source: message.source,
            level: type,
            text: message.text,
            lineNumber: message.line,
            timestamp: new Date().getTime(),
            url: message.url,
            stackTrace: message.stackTrace
                ? {
                    callFrames: message.stackTrace,
                }
                : undefined,
            networkRequestId: message.networkRequestId,
        };

        this._target.fireEventToTools('Log.entryAdded', {
            entry: consoleMessage,
        });

        return Promise.resolve(null);
    }
}
