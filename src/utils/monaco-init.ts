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
            const formatted = formatJSON(text);
            return [{
                range: model.getFullModelRange(),
                text: formatted
            }];
        }
    });
};

/**
 * Define (or re-define) the custom Monaco theme to match the app's
 * dark slate background and respect the user's syntax-color settings.
 */
export const defineCustomTheme = (settings: Settings) => {
    const c = settings.colors;

    monaco.editor.defineTheme('xmldiff-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            // XML tokens
            { token: 'tag', foreground: c.tagName.replace('#', '') },
            { token: 'tag.xml', foreground: c.tagName.replace('#', '') },
            { token: 'metatag', foreground: c.tagBracket.replace('#', '') },
            { token: 'metatag.xml', foreground: c.tagBracket.replace('#', '') },
            { token: 'metatag.content.xml', foreground: c.tagBracket.replace('#', '') },
            { token: 'delimiter', foreground: c.tagBracket.replace('#', '') },
            { token: 'delimiter.xml', foreground: c.tagBracket.replace('#', '') },
            { token: 'attribute.name', foreground: c.attrName.replace('#', '') },
            { token: 'attribute.name.xml', foreground: c.attrName.replace('#', '') },
            { token: 'attribute.value', foreground: c.attrValue.replace('#', '') },
            { token: 'attribute.value.xml', foreground: c.attrValue.replace('#', '') },
            { token: 'comment', foreground: c.comment.replace('#', '') },
            { token: 'comment.xml', foreground: c.comment.replace('#', '') },
            { token: 'comment.content.xml', foreground: c.comment.replace('#', '') },
            // JSON tokens
            { token: 'string.key.json', foreground: c.attrName.replace('#', '') },
            { token: 'string.value.json', foreground: c.attrValue.replace('#', '') },
            { token: 'number.json', foreground: c.tagName.replace('#', '') },
            { token: 'keyword.json', foreground: c.tagBracket.replace('#', '') },
            // General fallback
            { token: '', foreground: c.text.replace('#', '') },
        ],
        colors: {
            'editor.background': '#020617',          // slate-950
            'editor.foreground': c.text,
            'editor.lineHighlightBackground': '#0f172a', // slate-900
            'editorLineNumber.foreground': '#475569', // slate-600
            'editorLineNumber.activeForeground': '#94a3b8', // slate-400
            'editor.selectionBackground': '#334155',  // slate-700
            'editor.inactiveSelectionBackground': '#1e293b', // slate-800
            'editorWidget.background': '#0f172a',     // slate-900
            'editorWidget.border': '#334155',          // slate-700
            'input.background': '#1e293b',             // slate-800
            'input.border': '#475569',                 // slate-600
            'minimap.background': '#020617',           // slate-950
            'editorGutter.background': '#020617',      // slate-950
        }
    });

    // Apply the theme globally
    monaco.editor.setTheme('xmldiff-dark');
};

export const initMonaco = () => {
    // Just ensures this file is imported and side-effects run
    console.log('Monaco Editor initialized for offline usage');
};
