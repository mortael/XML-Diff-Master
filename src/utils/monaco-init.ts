import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker&inline';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker&inline';
import { formatXML, Settings } from './xml';
import { formatJSON } from './json';

// Configure the loader to use the local monaco instance
loader.config({ monaco });

// Configure the Monaco Environment to use inline workers
self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'json') {
            return new jsonWorker();
        }
        return new editorWorker();
    }
};

let formattersRegistered = false;

export const registerFormatters = (getSettings: () => Settings) => {
    if (formattersRegistered) return;
    formattersRegistered = true;

    monaco.languages.registerDocumentFormattingEditProvider('xml', {
        provideDocumentFormattingEdits: (model) => {
            const text = model.getValue();
            // Use current settings from the callback
            const formatted = formatXML(text, getSettings());
            return [{
                range: model.getFullModelRange(),
                text: formatted
            }];
        }
    });

    monaco.languages.registerDocumentFormattingEditProvider('json', {
        provideDocumentFormattingEdits: (model) => {
            const text = model.getValue();
            // JSON format doesn't currently use settings, but consistent pattern
            const formatted = formatJSON(text);
            return [{
                range: model.getFullModelRange(),
                text: formatted
            }];
        }
    });
};

export const initMonaco = () => {
    // Just ensures this file is imported and side-effects run
    console.log('Monaco Editor initialized for offline usage');
};
