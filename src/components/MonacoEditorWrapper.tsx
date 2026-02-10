import { useRef, useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

import { Settings } from '../utils/xml';
import { initMonaco, defineCustomTheme } from '../utils/monaco-init';
import { Upload, Download, Copy, Check, X, WrapText } from 'lucide-react';

// Ensure Monaco is initialized with correct worker paths
initMonaco();

interface MonacoEditorWrapperProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    language: 'xml' | 'json' | 'text';
    settings: Settings;
    error: { line: number; message: string } | null;
    onUpload: (file: File) => void;
    onClear: () => void;
    onSave: () => void;
    onToggleWordWrap: () => void;
    onFileNameChange: (name: string) => void;
    schemaErrors?: { line: number; message: string }[];
}

export const MonacoEditorWrapper = ({
    value,
    onChange,
    label,
    language,
    settings,
    error,
    onUpload,
    onClear,
    onSave,
    onToggleWordWrap,
    // onFileNameChange // Unused in this UI for now
    schemaErrors = []
}: MonacoEditorWrapperProps) => {
    const editorRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [copied, setCopied] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);

    const monacoRef = useRef<any>(null);

    const handleEditorDidMount: OnMount = (editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        // Apply custom theme on mount
        defineCustomTheme(settings);
    };

    // Re-apply custom theme when settings colors change
    useEffect(() => {
        if (monacoRef.current) {
            defineCustomTheme(settings);
        }
    }, [settings.colors]);

    // Sync error markers
    useEffect(() => {
        if (!editorRef.current || !monacoRef.current) return;
        const monaco = monacoRef.current;
        const model = editorRef.current.getModel();
        if (!model) return;

        if (error) {
            monaco.editor.setModelMarkers(model, 'owner', [
                {
                    startLineNumber: error.line,
                    startColumn: 1,
                    endLineNumber: error.line,
                    endColumn: 1000,
                    message: error.message,
                    severity: monaco.MarkerSeverity.Error
                }
            ]);
        } else if (schemaErrors && schemaErrors.length > 0) {
            monaco.editor.setModelMarkers(model, 'owner', schemaErrors.map(err => ({
                startLineNumber: err.line,
                startColumn: 1,
                endLineNumber: err.line,
                endColumn: 1000,
                message: err.message,
                severity: monaco.MarkerSeverity.Warning
            })));
        } else {
            monaco.editor.setModelMarkers(model, 'owner', []);
        }
    }, [error, schemaErrors]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onUpload) {
            onUpload(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCopy = async () => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        const file = e.dataTransfer.files?.[0];
        if (file && onUpload) onUpload(file);
    };

    return (
        <div
            className={`flex flex-col h-full border rounded-lg overflow-hidden bg-slate-900 shadow-md transition-colors ${isDragging ? 'border-indigo-500 border-2' : 'border-slate-800'}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-800 border-slate-700">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-300 text-sm uppercase tracking-wide">{label}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${language === 'json' ? 'bg-yellow-900/40 text-yellow-500' : language === 'text' ? 'bg-green-900/40 text-green-400' : 'bg-blue-900/40 text-blue-400'}`}>
                        {language.toUpperCase()}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {onToggleWordWrap && (
                        <button
                            onClick={onToggleWordWrap}
                            className={`p-1.5 rounded transition-colors ${settings.editor.wordWrap ? 'text-indigo-300 bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-700'}`}
                            title="Toggle Word Wrap"
                        >
                            <WrapText size={16} />
                        </button>
                    )}

                    <div className="h-4 w-px bg-slate-700 mx-1"></div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xml,.txt,.json,.xsd"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded transition-colors"
                        title="Upload File"
                    >
                        <Upload size={16} />
                    </button>

                    <button
                        onClick={onSave}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded transition-colors"
                        title="Save / Download"
                        disabled={!value}
                    >
                        <Download size={16} />
                    </button>

                    <button
                        onClick={handleCopy}
                        className={`p-1.5 rounded transition-colors ${copied ? 'text-green-400 bg-green-900/30' : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-700'}`}
                        title="Copy to Clipboard"
                        disabled={!value}
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>

                    {value && (
                        <button
                            onClick={onClear}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                            title="Clear"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {isDragging && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-indigo-900/30 backdrop-blur-sm border-2 border-dashed border-indigo-400 rounded pointer-events-none">
                        <div className="text-indigo-300 font-medium flex items-center gap-2">
                            <Upload size={24} /> Drop file here
                        </div>
                    </div>
                )}
                <Editor
                    height="100%"
                    defaultLanguage={language === 'text' ? 'plaintext' : language}
                    language={language === 'text' ? 'plaintext' : language}
                    value={value}
                    theme="xmldiff-dark"
                    onChange={(val: string | undefined) => onChange(val || '')}
                    onMount={handleEditorDidMount}
                    options={{
                        minimap: { enabled: true },
                        wordWrap: settings.editor.wordWrap ? 'on' : 'off',
                        fontSize: settings.editor.fontSize === 'xs' ? 12 : settings.editor.fontSize === 'sm' ? 14 : settings.editor.fontSize === 'lg' ? 18 : 16,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        padding: { top: 10, bottom: 10 },
                        formatOnPaste: settings.editor.autoFormat === 'always' || settings.editor.autoFormat === 'paste',
                        formatOnType: settings.editor.autoFormat === 'always',
                    }}
                />
            </div>
        </div>
    );
};
