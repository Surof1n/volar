import { TextDocument } from 'vscode-languageserver-textdocument';
import { EmbeddedLanguageServicePlugin } from '@volar/vue-language-service-types';
import type * as ts from 'typescript/lib/tsserverlibrary';
import * as ts2 from '@volar/typescript-language-service';
import * as semver from 'semver';
import * as vscode from 'vscode-languageserver-protocol';

function getBasicTriggerCharacters(tsVersion: string) {

    const triggerCharacters = ['.', '"', '\'', '`', '/', '<'];

    // https://github.com/microsoft/vscode/blob/8e65ae28d5fb8b3c931135da1a41edb9c80ae46f/extensions/typescript-language-features/src/languageFeatures/completions.ts#L811-L833
    if (semver.lt(tsVersion, '3.1.0') || semver.gte(tsVersion, '3.2.0')) {
        triggerCharacters.push('@');
    }
    if (semver.gte(tsVersion, '3.8.1')) {
        triggerCharacters.push('#');
    }
    if (semver.gte(tsVersion, '4.3.0')) {
        triggerCharacters.push(' ');
    }

    return triggerCharacters;
}

const jsDocTriggerCharacters = ['*'];
const directiveCommentTriggerCharacters = ['@'];

export default function (host: {
    tsVersion: string,
    getTsLs: () => ts2.LanguageService,
    baseCompletionOptions?: ts.GetCompletionsAtPositionOptions,
}): EmbeddedLanguageServicePlugin {

    const basicTriggerCharacters = getBasicTriggerCharacters(host.tsVersion);

    return {

        triggerCharacters: [
            ...basicTriggerCharacters,
            ...jsDocTriggerCharacters,
            ...directiveCommentTriggerCharacters,
        ],

        doValidation(document, options) {
            if (isTsDocument(document)) {
                return host.getTsLs().doValidation(document.uri, options);
            }
        },

        async doComplete(document, position, context) {
            if (isTsDocument(document)) {

                let result: vscode.CompletionList = {
                    isIncomplete: false,
                    items: [],
                };

                if (!context || context.triggerKind !== vscode.CompletionTriggerKind.TriggerCharacter || (context.triggerCharacter && basicTriggerCharacters.includes(context.triggerCharacter))) {

                    const options: ts.GetCompletionsAtPositionOptions = {
                        ...host.baseCompletionOptions,
                        triggerCharacter: context?.triggerCharacter as ts.CompletionsTriggerCharacter,
                        triggerKind: context?.triggerKind,
                    };
                    const basicResult = await host.getTsLs().doComplete(document.uri, position, options);

                    if (basicResult) {
                        result = basicResult;
                    }
                }
                if (!context || context.triggerKind !== vscode.CompletionTriggerKind.TriggerCharacter || (context.triggerCharacter && jsDocTriggerCharacters.includes(context.triggerCharacter))) {

                    const jsdocResult = await host.getTsLs().doJsDocComplete(document.uri, position);

                    if (jsdocResult) {
                        result.items.push(jsdocResult);
                    }
                }
                if (!context || context.triggerKind !== vscode.CompletionTriggerKind.TriggerCharacter || (context.triggerCharacter && directiveCommentTriggerCharacters.includes(context.triggerCharacter))) {

                    const directiveCommentResult = await host.getTsLs().doDirectiveCommentComplete(document.uri, position);

                    if (directiveCommentResult) {
                        result.items = result.items.concat(directiveCommentResult);
                    }
                }

                return result;
            }
        },

        doCompleteResolve(item) {
            return host.getTsLs().doCompletionResolve(item);
        },

        doHover(document, position) {
            if (isTsDocument(document)) {
                return host.getTsLs().doHover(document.uri, position);
            }
        },

        findDefinition(document, position) {
            if (isTsDocument(document)) {
                return host.getTsLs().findDefinition(document.uri, position);
            }
        },

        findTypeDefinition(document, position) {
            if (isTsDocument(document)) {
                return host.getTsLs().findTypeDefinition(document.uri, position);
            }
        },

        findImplementations(document, position) {
            if (isTsDocument(document)) {
                return host.getTsLs().findImplementations(document.uri, position);
            }
        },

        findReferences(document, position) {
            if (isTsDocument(document) || isJsonDocument(document)) {
                return host.getTsLs().findReferences(document.uri, position);
            }
        },

        findDocumentHighlights(document, position) {
            if (isTsDocument(document)) {
                return host.getTsLs().findDocumentHighlights(document.uri, position);
            }
        },

        findDocumentSymbols(document) {
            if (isTsDocument(document)) {
                return host.getTsLs().findDocumentSymbols(document.uri);
            }
        },

        findDocumentSemanticTokens(document, range, cancleToken) {
            if (isTsDocument(document)) {
                return host.getTsLs().getDocumentSemanticTokens(document.uri, range, cancleToken);
            }
        },

        findWorkspaceSymbols(query) {
            return host.getTsLs().findWorkspaceSymbols(query);
        },

        doCodeActions(document, range, context) {
            if (isTsDocument(document)) {
                return host.getTsLs().getCodeActions(document.uri, range, context);
            }
        },

        doCodeActionResolve(codeAction) {
            return host.getTsLs().doCodeActionResolve(codeAction);
        },

        doRenamePrepare(document, position) {
            if (isTsDocument(document)) {
                return host.getTsLs().prepareRename(document.uri, position);
            }
        },

        doRename(document, position, newName) {
            if (isTsDocument(document) || isJsonDocument(document)) {
                return host.getTsLs().doRename(document.uri, position, newName);
            }
        },

        doFileRename(oldUri, newUri) {
            return host.getTsLs().getEditsForFileRename(oldUri, newUri);
        },

        getFoldingRanges(document) {
            if (isTsDocument(document)) {
                return host.getTsLs().getFoldingRanges(document.uri);
            }
        },

        getSelectionRanges(document, positions) {
            if (isTsDocument(document)) {
                return host.getTsLs().getSelectionRanges(document.uri, positions);
            }
        },

        getSignatureHelp(document, position, context) {
            if (isTsDocument(document)) {
                return host.getTsLs().getSignatureHelp(document.uri, position, context);
            }
        },

        format(document, range, options) {
            if (isTsDocument(document)) {
                return host.getTsLs().doFormatting(document.uri, options, range);
            }
        },

        callHierarchy: {

            doPrepare(document, position) {
                if (isTsDocument(document)) {
                    return host.getTsLs().callHierarchy.doPrepare(document.uri, position);
                }
            },

            getIncomingCalls(item) {
                return host.getTsLs().callHierarchy.getIncomingCalls(item);
            },

            getOutgoingCalls(item) {
                return host.getTsLs().callHierarchy.getOutgoingCalls(item);
            },
        },
    };
}

export function isTsDocument(document: TextDocument) {
    return document.languageId === 'javascript' ||
        document.languageId === 'typescript' ||
        document.languageId === 'javascriptreact' ||
        document.languageId === 'typescriptreact';
}

export function isJsonDocument(document: TextDocument) {
    return document.languageId === 'json' ||
        document.languageId === 'jsonc';
}