import { useState, useRef, useEffect, useMemo } from 'react';
import { AlertTriangle, Search, Upload, Download, Check, Copy, X, ChevronUp, ChevronDown, FileCode, FolderTree, Code } from 'lucide-react';
import { highlightXML, Settings } from '../utils/xml';
import { TreeView } from './TreeView';

interface XmlEditorProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    error: { line: number; message: string } | null;
    onUpload?: (file: File) => void;
    onClear: () => void;
    settings: Settings;
    schemaErrors?: { line: number; message: string }[];
    onFormat: (xml: string) => string;
    onSave: () => void;
    onFileNameChange: (name: string) => void;
    onUndo: () => void;
    onRedo: () => void;
}

export const XmlEditor = ({
    value,
    onChange,
    label,
    error,
    onUpload,
    onClear,
    settings,
    schemaErrors = [],
    onFormat,
    onSave,
    onFileNameChange,
    onUndo,
    onRedo
}: XmlEditorProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);
    const dragCounter = useRef(0);
    const [copied, setCopied] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMatches, setSearchMatches] = useState<number[]>([]);
    const [currentMatch, setCurrentMatch] = useState(0);
    const [viewMode, setViewMode] = useState<'code' | 'tree'>('code');

    const lineNumbers = useMemo(() => {
        if (!value) return [1];
        return Array.from({ length: value.split('\n').length }, (_, i) => i + 1);
    }, [value]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onUpload) {
            onUpload(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const af = settings?.editor?.autoFormat;
        const shouldFormat = onFormat && (af === true || af === 'paste' || af === 'always');

        if (shouldFormat) {
            const pasted = e.clipboardData.getData('text');
            const trimmed = pasted.trim();
            if (trimmed.startsWith('<') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
                e.preventDefault();
                const formatted = onFormat(pasted);

                const textarea = textareaRef.current;
                if (!textarea) return;

                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;

                const before = value.substring(0, start);
                const after = value.substring(end);

                if (!value) {
                    onChange(formatted);
                } else {
                    onChange(before + formatted + after);
                }

                if (onFileNameChange) onFileNameChange('untitled.xml');
            }
        }
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
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        const file = e.dataTransfer.files?.[0];
        if (file && onUpload) onUpload(file);
    };

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (preRef.current) {
            preRef.current.scrollTop = e.currentTarget.scrollTop;
            preRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
        const lineNumEl = document.getElementById(`linenums-${label.replace(/\s/g, '')}`);
        if (lineNumEl) {
            lineNumEl.scrollTop = e.currentTarget.scrollTop;
        }
    };

    const jumpToLine = (lineNum: number) => {
        if (!textareaRef.current) return;
        const lines = value.split('\n');
        let charPos = 0;
        for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
            charPos += lines[i].length + 1;
        }
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(charPos, charPos + (lines[lineNum - 1]?.length || 0));

        const lineHeight = 20;
        textareaRef.current.scrollTop = (lineNum - 5) * lineHeight;
    };

    useEffect(() => {
        if (!searchQuery || !value) {
            setSearchMatches([]);
            return;
        }
        const matches: number[] = [];
        const query = searchQuery.toLowerCase();
        let idx = value.toLowerCase().indexOf(query);
        while (idx !== -1) {
            matches.push(idx);
            idx = value.toLowerCase().indexOf(query, idx + 1);
        }
        setSearchMatches(matches);
        setCurrentMatch(0);
    }, [searchQuery, value]);

    const goToMatch = (index: number) => {
        if (!textareaRef.current || searchMatches.length === 0) return;
        const pos = searchMatches[index];
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos + searchQuery.length);
    };

    const nextMatch = () => {
        const next = (currentMatch + 1) % searchMatches.length;
        setCurrentMatch(next);
        goToMatch(next);
    };

    const prevMatch = () => {
        const prev = (currentMatch - 1 + searchMatches.length) % searchMatches.length;
        setCurrentMatch(prev);
        goToMatch(prev);
    };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                setShowSearch(true);
            }
            if (e.key === 'Escape') {
                setShowSearch(false);
                setSearchQuery('');
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    onRedo?.();
                } else {
                    onUndo?.();
                }
            } else if (e.key === 'y') {
                e.preventDefault();
                onRedo?.();
            }
        }
    };


    return (
        <div
            className={`flex flex-col h-full border rounded-lg overflow-hidden bg-slate-900 shadow-md transition-colors ${isDragging ? 'border-indigo-500 border-2' : error ? 'border-red-900/50' : 'border-slate-800'}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className={`flex items-center justify-between px-3 py-2 border-b ${error ? 'bg-red-900/20 border-red-900/30' : 'bg-slate-800 border-slate-700'}`}>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-300 text-sm uppercase tracking-wide">{label}</span>
                    {error && (
                        <button
                            onClick={() => jumpToLine(error.line)}
                            className="flex items-center text-red-400 text-xs gap-1 animate-pulse hover:text-red-300 cursor-pointer"
                            title={`Click to jump to line ${error.line}`}
                        >
                            <AlertTriangle size={14} />
                            <span className="truncate max-w-[150px] font-medium underline">Line {error.line}: Invalid XML</span>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setViewMode(viewMode === 'code' ? 'tree' : 'code')}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'tree' ? 'text-indigo-300 bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-700'}`}
                        title={viewMode === 'code' ? "Switch to Tree View" : "Switch to Code View"}
                    >
                        {viewMode === 'code' ? <FolderTree size={16} /> : <Code size={16} />}
                    </button>
                    <div className="h-4 w-px bg-slate-700 mx-1"></div>

                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`p-1.5 rounded transition-colors ${showSearch ? 'text-indigo-400 bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-700'}`}
                        title="Search (Ctrl+F)"
                    >
                        <Search size={16} />
                    </button>
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

            {showSearch && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border-b border-slate-700">
                    <Search size={14} className="text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.shiftKey ? prevMatch() : nextMatch(); }}
                        placeholder="Search..."
                        className="flex-1 bg-slate-700 text-slate-200 text-sm px-2 py-1 rounded border border-slate-600 focus:outline-none focus:border-indigo-500"
                        autoFocus
                    />
                    <span className="text-xs text-slate-500 min-w-[60px]">
                        {searchMatches.length > 0 ? `${currentMatch + 1} / ${searchMatches.length}` : 'No matches'}
                    </span>
                    <button onClick={prevMatch} className="p-1 text-slate-400 hover:text-slate-200" disabled={searchMatches.length === 0}><ChevronUp size={16} /></button>
                    <button onClick={nextMatch} className="p-1 text-slate-400 hover:text-slate-200" disabled={searchMatches.length === 0}><ChevronDown size={16} /></button>
                    <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-1 text-slate-400 hover:text-slate-200"><X size={16} /></button>
                </div>
            )}

            <div className="relative flex-1 bg-slate-900 overflow-hidden flex">
                {viewMode === 'code' && (
                    <>
                        {/* Line Numbers */}
                        <div
                            id={`linenums-${label.replace(/\s/g, '')}`}
                            className="w-10 shrink-0 bg-slate-950 border-r border-slate-800 text-slate-600 text-xs font-mono text-right py-3 pr-2 select-none overflow-hidden"
                            style={{ lineHeight: '1.5' }}
                        >
                            {lineNumbers.map(n => (
                                <div key={n}>{n}</div>
                            ))}
                        </div>

                        <div className="relative flex-1 h-full overflow-hidden">
                            {isDragging && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-indigo-900/30 backdrop-blur-sm border-2 border-dashed border-indigo-400 rounded">
                                    <div className="text-indigo-300 font-medium flex items-center gap-2">
                                        <Upload size={24} /> Drop XML file here
                                    </div>
                                </div>
                            )}
                            <pre
                                ref={preRef}
                                className="absolute inset-0 w-full h-full p-3 font-mono text-xs sm:text-sm overflow-hidden pointer-events-none whitespace-pre-wrap break-all m-0"
                                style={{ color: '#e2e8f0', lineHeight: '1.5' }}
                                aria-hidden="true"
                                dangerouslySetInnerHTML={{ __html: highlightXML(value, settings?.colors) + '\n' }}
                            />
                            <textarea
                                ref={textareaRef}
                                className="absolute inset-0 w-full h-full p-3 font-mono text-xs sm:text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 bg-transparent text-transparent caret-slate-200 placeholder-slate-600 overflow-auto"
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                onScroll={handleScroll}
                                onPaste={handlePaste}
                                onKeyDown={handleKeyDown}
                                placeholder={`Paste ${label} XML here or drag & drop a file...`}
                                spellCheck={false}
                                style={{ caretColor: '#e2e8f0', lineHeight: '1.5' }}
                            />
                        </div>
                    </>
                )}

                {viewMode === 'tree' && (
                    <div className="flex-1 overflow-hidden bg-slate-950">
                        <TreeView xml={value} />
                    </div>
                )}
            </div>

            {error && (
                <button
                    onClick={() => jumpToLine(error.line)}
                    className="px-3 py-1.5 bg-red-900/20 border-t border-red-900/30 text-red-300 text-xs flex items-start gap-2 hover:bg-red-900/30 transition-colors cursor-pointer w-full text-left"
                >
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <span className="underline">Click to jump to line {error.line}: {error.message}</span>
                </button>
            )}

            {schemaErrors.length > 0 && (
                <div className="px-3 py-1.5 bg-amber-900/20 border-t border-amber-900/30 text-amber-300 text-xs max-h-20 overflow-y-auto">
                    <div className="flex items-center gap-1 font-medium mb-1">
                        <FileCode size={12} /> Schema Validation ({schemaErrors.length} issue{schemaErrors.length > 1 ? 's' : ''})
                    </div>
                    {schemaErrors.slice(0, 5).map((err, i) => (
                        <button
                            key={i}
                            onClick={() => jumpToLine(err.line)}
                            className="block w-full text-left text-amber-400 hover:text-amber-200 truncate py-0.5 underline"
                        >
                            Line {err.line}: {err.message}
                        </button>
                    ))}
                    {schemaErrors.length > 5 && <div className="text-amber-500">...and {schemaErrors.length - 5} more</div>}
                </div>
            )}
        </div>
    );
};
