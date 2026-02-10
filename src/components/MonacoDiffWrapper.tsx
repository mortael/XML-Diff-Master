import { useRef, useEffect } from 'react';
import { DiffEditor, DiffOnMount } from '@monaco-editor/react';
import { Settings } from '../utils/xml';
import { initMonaco, defineCustomTheme } from '../utils/monaco-init';

initMonaco();

interface MonacoDiffWrapperProps {
    original: string;
    modified: string;
    language: 'xml' | 'json' | 'text';
    settings: Settings;
    diffMode: 'lines' | 'words' | 'chars';
    ignoreWhitespace: boolean;
}

export const MonacoDiffWrapper = ({
    original,
    modified,
    language,
    settings,
    diffMode,
    ignoreWhitespace
}: MonacoDiffWrapperProps) => {
    const diffEditorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);

    const handleEditorDidMount: DiffOnMount = (editor: any, monaco: any) => {
        diffEditorRef.current = editor;
        monacoRef.current = monaco;
        defineCustomTheme(settings);
    };

    // Re-apply custom theme when settings colors change
    useEffect(() => {
        if (monacoRef.current) {
            defineCustomTheme(settings);
        }
    }, [settings.colors]);

    return (
        <div className="flex flex-col h-full bg-slate-950">
            <div className="flex-1 overflow-hidden">
                <DiffEditor
                    height="100%"
                    original={original}
                    modified={modified}
                    language={language === 'text' ? 'plaintext' : language}
                    theme="xmldiff-dark"
                    onMount={handleEditorDidMount}
                    options={{
                        minimap: { enabled: true },
                        wordWrap: settings.editor.wordWrap ? 'on' : 'off',
                        fontSize: settings.editor.fontSize === 'xs' ? 12 : settings.editor.fontSize === 'sm' ? 14 : settings.editor.fontSize === 'lg' ? 18 : 16,
                        readOnly: true,
                        // If lines mode, maybe we prefer inline to resemble unified, but normally split is better
                        // But since user asked, let's map 'lines' to Inline to give them a "change" in result
                        renderSideBySide: diffMode !== 'lines',
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        diffWordWrap: settings.editor.wordWrap ? 'on' : 'off',
                        ignoreTrimWhitespace: ignoreWhitespace, // Map our toolbar setting
                    }}
                />
            </div>
        </div>
    );
};
