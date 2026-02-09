import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings as SettingsIcon, FileCode, CheckCircle } from 'lucide-react';
import { useUndo } from './hooks/useUndo';
import { Toolbar } from './components/Toolbar';
import { XmlEditor } from './components/XmlEditor';
import { DiffView } from './components/DiffView';
import { SettingsModal } from './components/SettingsModal';
import { validateXML, formatXML, sortXML, validateAgainstSchema, Settings } from './utils/xml';
import { validateJSON, formatJSON, sortJSON } from './utils/json';
import { validateText, formatText, sortText } from './utils/text';
import { computeDiff, ComparisonResult } from './utils/diff';
import { MonacoEditorWrapper } from './components/MonacoEditorWrapper';
import { MonacoDiffWrapper } from './components/MonacoDiffWrapper';
import { clsx } from 'clsx';
import { Button } from './components/ui/Button';
import { registerFormatters } from './utils/monaco-init';

function App() {
    const leftContent = useUndo('');
    const rightContent = useUndo('');

    // Toggle for switching engines
    const [useMonaco, setUseMonaco] = useState(true);
    const [useLibxml, setUseLibxml] = useState(false);

    const [leftMode, setLeftMode] = useState<'xml' | 'json' | 'text'>('xml');
    const [rightMode, setRightMode] = useState<'xml' | 'json' | 'text'>('xml');

    const leftTypingRef = useRef(false);
    const leftTimeoutRef = useRef<number | null>(null);

    const rightTypingRef = useRef(false);
    const rightTimeoutRef = useRef<number | null>(null);

    const [leftError, setLeftError] = useState<{ line: number; message: string } | null>(null);
    const [rightError, setRightError] = useState<{ line: number; message: string } | null>(null);

    const [diffMode, setDiffMode] = useState<'lines' | 'words' | 'chars'>('lines');
    const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
    const [ignoreBlankLines, setIgnoreBlankLines] = useState(false);
    const [ignoreComments, setIgnoreComments] = useState(false);

    const [comparison, setComparison] = useState<ComparisonResult>({
        leftLines: [],
        rightLines: [],
        unifiedLines: [],
        diffMode: 'lines'
    });

    const [viewState, setViewState] = useState<'EDIT' | 'DIFF'>('EDIT');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [leftFileName, setLeftFileName] = useState('untitled.xml');
    const [rightFileName, setRightFileName] = useState('untitled.xml');

    // XSD Schema validation state
    const [xsdSchema, setXsdSchema] = useState('');
    const [leftSchemaErrors, setLeftSchemaErrors] = useState<{ line: number; message: string }[]>([]);
    const [rightSchemaErrors, setRightSchemaErrors] = useState<{ line: number; message: string }[]>([]);
    const [showSchemaPanel, setShowSchemaPanel] = useState(false);

    // Default settings
    const defaultSettings: Settings = {
        colors: {
            tagBracket: '#818cf8',
            tagName: '#f472b6',
            attrName: '#67e8f9',
            attrValue: '#a3e635',
            comment: '#6b7280',
            text: '#e2e8f0'
        },
        editor: {
            fontSize: 'sm',
            wordWrap: false,
            autoFormat: 'paste',
            normalizeWhitespace: false
        },
        diff: {
            showLineNumbers: true,
            contextLines: 3
        }
    };

    const [settings, setSettings] = useState<Settings>(() => {
        try {
            const saved = localStorage.getItem('xmldiff-settings');
            if (!saved) return defaultSettings;

            const parsed = JSON.parse(saved);

            // Deep merge logic to ensure no keys are lost
            return {
                ...defaultSettings,
                ...parsed,
                colors: { ...defaultSettings.colors, ...(parsed.colors || {}) },
                editor: { ...defaultSettings.editor, ...(parsed.editor || {}) },
                diff: { ...defaultSettings.diff, ...(parsed.diff || {}) }
            };
        } catch { return defaultSettings; }
    });

    const settingsRef = useRef(settings);
    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    useEffect(() => {
        try { localStorage.setItem('xmldiff-settings', JSON.stringify(settings)); } catch { }
    }, [settings]);

    // Register Monaco formatters once
    useEffect(() => {
        registerFormatters(() => settingsRef.current);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            if (leftMode === 'xml') setLeftError(validateXML(leftContent.state));
            else if (leftMode === 'json') setLeftError(validateJSON(leftContent.state));
            else setLeftError(validateText(leftContent.state));
        }, 500);
        return () => clearTimeout(t);
    }, [leftContent.state, leftMode]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (rightMode === 'xml') setRightError(validateXML(rightContent.state));
            else if (rightMode === 'json') setRightError(validateJSON(rightContent.state));
            else setRightError(validateText(rightContent.state));
        }, 500);
        return () => clearTimeout(t);
    }, [rightContent.state, rightMode]);

    // Schema validation effects (Only enable if mode is XML)
    useEffect(() => {
        let active = true;
        const validate = async () => {
            if (xsdSchema && leftContent.state && leftMode === 'xml') {
                try {
                    const result = await validateAgainstSchema(leftContent.state, xsdSchema, useLibxml);
                    if (active) setLeftSchemaErrors(result.errors);
                } catch (e) {
                    console.error("Validation error", e);
                }
            } else {
                if (active) setLeftSchemaErrors([]);
            }
        };
        validate();
        return () => { active = false; };
    }, [leftContent.state, xsdSchema, leftMode, useLibxml]);

    useEffect(() => {
        let active = true;
        const validate = async () => {
            if (xsdSchema && rightContent.state && rightMode === 'xml') {
                try {
                    const result = await validateAgainstSchema(rightContent.state, xsdSchema, useLibxml);
                    if (active) setRightSchemaErrors(result.errors);
                } catch (e) {
                    console.error("Validation error", e);
                }
            } else {
                if (active) setRightSchemaErrors([]);
            }
        };
        validate();
        return () => { active = false; };
    }, [rightContent.state, xsdSchema, rightMode, useLibxml]);

    const handleLeftChange = (val: string) => {
        if (!leftTypingRef.current) {
            leftContent.saveSnapshot();
            leftTypingRef.current = true;
        }
        leftContent.setState(val);
        if (leftTimeoutRef.current) clearTimeout(leftTimeoutRef.current);
        leftTimeoutRef.current = setTimeout(() => { leftTypingRef.current = false; }, 1000);
    };

    const handleRightChange = (val: string) => {
        if (!rightTypingRef.current) {
            rightContent.saveSnapshot();
            rightTypingRef.current = true;
        }
        rightContent.setState(val);
        if (rightTimeoutRef.current) clearTimeout(rightTimeoutRef.current);
        rightTimeoutRef.current = setTimeout(() => { rightTypingRef.current = false; }, 1000);
    };

    const handleUpload = async (side: 'left' | 'right', file: File) => {
        try {
            let text = await file.text();

            // Detect type immediately
            const trimmed = text.trim();
            const isJson = trimmed.startsWith('{') || trimmed.startsWith('[');
            const isXml = trimmed.startsWith('<');
            const mode = isJson ? 'json' : isXml ? 'xml' : 'text';

            if (side === 'left') setLeftMode(mode);
            else setRightMode(mode);

            if (settings?.editor?.autoFormat === 'always') {
                if (mode === 'json') text = formatJSON(text);
                else if (mode === 'xml') text = formatXML(text, settings);
                else text = formatText(text);
            }

            // We manually call the update logic here to bypass normal typing debounce
            if (side === 'left') {
                leftContent.setWithHistory(text);
                setLeftFileName(file.name);
            } else {
                rightContent.setWithHistory(text);
                setRightFileName(file.name);
            }
        } catch (e) {
            alert("Failed to read file");
        }
    };

    const handleSave = (side: 'left' | 'right') => {
        const content = side === 'left' ? leftContent.state : rightContent.state;
        const mode = side === 'left' ? leftMode : rightMode;
        if (!content) return;
        const name = side === 'left' ? leftFileName : rightFileName;
        const mimeType = mode === 'json' ? 'application/json' : mode === 'xml' ? 'text/xml' : 'text/plain';
        const defaultName = mode === 'json' ? 'untitled.json' : mode === 'xml' ? 'untitled.xml' : 'untitled.txt';
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name || defaultName;
        a.click();
        URL.revokeObjectURL(url);
    };

    const [semanticDiff, setSemanticDiff] = useState(false);

    const executeDiff = useCallback(() => {
        setIsProcessing(true);
        setTimeout(() => {
            // For JSON, we might want to ensure it's formatted for better diffing?
            // Or just trust the diff engine. The engine is text-based.
            // If the user wants semantic diff, they should Prettify first. 
            // We'll leave it raw to respect whitespace unless 'ignoreWhitespace' is on.

            let oldText = leftContent.state;
            let newText = rightContent.state;

            if (semanticDiff) {
                try {
                    // Try to sort if it looks like JSON or XML
                    if (leftMode === 'json') oldText = sortJSON(oldText);
                    else if (leftMode === 'xml') oldText = sortXML(oldText, settings);
                    else oldText = sortText(oldText);
                } catch (e) { /* Ignore sort errors, best effort */ }

                try {
                    if (rightMode === 'json') newText = sortJSON(newText);
                    else if (rightMode === 'xml') newText = sortXML(newText, settings);
                    else newText = sortText(newText);
                } catch (e) { /* Ignore sort errors */ }
            }

            const result = computeDiff(
                oldText,
                newText,
                diffMode,
                ignoreWhitespace,
                ignoreBlankLines,
                ignoreComments
            );
            setComparison(result);
            setIsProcessing(false);
        }, 10);
    }, [leftContent.state, rightContent.state, diffMode, ignoreWhitespace, ignoreBlankLines, ignoreComments, semanticDiff, leftMode, rightMode, settings]);

    useEffect(() => {
        if (viewState === 'DIFF') {
            executeDiff();
        }
    }, [diffMode, ignoreWhitespace, ignoreBlankLines, ignoreComments, semanticDiff, viewState, executeDiff]);

    const handleToggleView = () => {
        if (viewState === 'EDIT') {
            setViewState('DIFF');
        } else {
            setViewState('EDIT');
        }
    };

    const handleSort = (side?: 'left' | 'right' | 'both') => {
        const s = (typeof side === 'string' ? side : 'both');
        try {
            if ((s === 'left' || s === 'both') && leftContent.state) {
                const sorted = leftMode === 'json' ? sortJSON(leftContent.state) : 
                              leftMode === 'xml' ? sortXML(leftContent.state, settings) : 
                              sortText(leftContent.state);
                leftContent.setWithHistory(sorted);
            }
            if ((s === 'right' || s === 'both') && rightContent.state) {
                const sorted = rightMode === 'json' ? sortJSON(rightContent.state) : 
                              rightMode === 'xml' ? sortXML(rightContent.state, settings) : 
                              sortText(rightContent.state);
                rightContent.setWithHistory(sorted);
            }
        } catch (e) {
            alert("Could not sort content. Please ensure it is valid.");
        }
    };

    const handlePrettify = (side?: 'left' | 'right' | 'both') => {
        const s = (typeof side === 'string' ? side : 'both');
        if ((s === 'left' || s === 'both') && leftContent.state) {
            const formatted = leftMode === 'json' ? formatJSON(leftContent.state) : 
                            leftMode === 'xml' ? formatXML(leftContent.state, settings) : 
                            formatText(leftContent.state);
            leftContent.setWithHistory(formatted);
        }
        if ((s === 'right' || s === 'both') && rightContent.state) {
            const formatted = rightMode === 'json' ? formatJSON(rightContent.state) : 
                            rightMode === 'xml' ? formatXML(rightContent.state, settings) : 
                            formatText(rightContent.state);
            rightContent.setWithHistory(formatted);
        }
    };

    const hasContent = !!(leftContent.state || rightContent.state);

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800">
                <Toolbar
                    diffMode={diffMode}
                    setDiffMode={setDiffMode as (m: string) => void}
                    ignoreWhitespace={ignoreWhitespace}
                    setIgnoreWhitespace={setIgnoreWhitespace}
                    ignoreBlankLines={ignoreBlankLines}
                    setIgnoreBlankLines={setIgnoreBlankLines}
                    ignoreComments={ignoreComments}
                    setIgnoreComments={setIgnoreComments}
                    semanticDiff={semanticDiff}
                    setSemanticDiff={setSemanticDiff}
                    onSort={handleSort}
                    onPrettify={handlePrettify}
                    isEditing={viewState === 'EDIT'}
                    onToggleEdit={handleToggleView}
                    hasContent={hasContent}
                />

                <div className="flex items-center gap-2 pr-4 bg-slate-900 h-full border-l border-slate-800">
                    {/* Libxml2 Toggle */}
                    <Button
                        onClick={() => setUseLibxml(!useLibxml)}
                        size="sm"
                        variant="ghost"
                        className={clsx("text-xs mr-2 transition-colors", useLibxml ? "text-cyan-400 bg-cyan-950/30 font-bold" : "text-slate-500 hover:text-slate-300")}
                        title={useLibxml ? "Using Industrial-Strength Validation (Libxml2 WASM)" : "Using Standard Validation (Custom JS)"}
                    >
                        {useLibxml ? "Libxml2" : "Std Val"}
                    </Button>

                    <Button
                        onClick={() => setShowSchemaPanel(!showSchemaPanel)}
                        size="sm"
                        variant={showSchemaPanel ? 'primary' : 'ghost'}
                        className={showSchemaPanel ? '' : (xsdSchema ? 'text-green-400 hover:bg-green-900/20 hover:text-green-300' : 'text-amber-400 hover:bg-amber-900/20 hover:text-amber-300')}
                        title="XSD Schema Validation"
                        disabled={leftMode === 'json' && rightMode === 'json'}
                    >
                        <FileCode size={16} className="mr-1.5" />
                        Schema
                    </Button>
                    <Button
                        onClick={() => setUseMonaco(!useMonaco)}
                        size="sm"
                        variant="ghost"
                        className="text-xs text-slate-500 hover:text-slate-300 mr-2"
                        title={useMonaco ? "Switch to Legacy Editor" : "Switch to Monaco Editor"}
                    >
                        {useMonaco ? "Leg" : "Mon"}
                    </Button>
                    <Button
                        onClick={() => setShowSettings(true)}
                        size="sm"
                        variant="ghost"
                        title="Settings"
                    >
                        <SettingsIcon size={18} />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {/* Schema Panel */}
                {showSchemaPanel && (
                    <div className="absolute top-0 left-0 right-0 z-20 bg-slate-900 border-b border-slate-700 shadow-lg animate-in slide-in-from-top duration-200">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                                    <FileCode size={16} /> XSD Schema Validation
                                </h3>
                                <button onClick={() => setShowSchemaPanel(false)} className="text-slate-500 hover:text-slate-300">
                                    <span className="sr-only">Close</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div
                                className="relative"
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={async (e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) {
                                        try { const text = await file.text(); setXsdSchema(text); } catch { alert("Failed to read file"); }
                                    }
                                }}
                            >
                                <textarea
                                    value={xsdSchema}
                                    onChange={(e) => setXsdSchema(e.target.value)}
                                    placeholder="Paste XSD Schema here to validate both XML inputs..."
                                    className="w-full h-32 bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 resize-none"
                                />
                                <div className="absolute bottom-2 right-2 flex gap-2">
                                    <input
                                        type="file"
                                        id="xsd-upload"
                                        accept=".xsd,.xml"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                try { const text = await file.text(); setXsdSchema(text); } catch { alert("Failed to read file"); }
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor="xsd-upload"
                                        className="cursor-pointer px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-xs transition-colors flex items-center gap-1 shadow-sm border border-slate-700"
                                        title="Upload XSD File"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                                        Upload
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                                <span>Validation is performed automatically as you type. Only applies to XML content.</span>
                                {xsdSchema && (
                                    <span className="flex items-center gap-1 text-green-400">
                                        <CheckCircle size={12} /> Schema Active
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="h-full">
                    {viewState === 'EDIT' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 h-full gap-px bg-slate-800">
                            <div className={clsx("h-full bg-slate-950 p-2 overflow-hidden", settings.editor.fontSize === 'xs' ? 'text-xs' : settings.editor.fontSize === 'sm' ? 'text-sm' : settings.editor.fontSize === 'lg' ? 'text-lg' : 'text-base')}>
                                {useMonaco ? (
                                    <MonacoEditorWrapper
                                        label="Left"
                                        language={leftMode}
                                        value={leftContent.state}
                                        onChange={(val) => {
                                            if (!leftContent.state) {
                                                const t = val.trim();
                                                if (t.startsWith('{') || t.startsWith('[')) setLeftMode('json');
                                                else if (t.startsWith('<')) setLeftMode('xml');
                                                else if (t) setLeftMode('text');
                                            }
                                            leftContent.setState(val);
                                        }}
                                        settings={settings}
                                        error={leftError}
                                        onUpload={(f) => handleUpload('left', f)}
                                        onClear={() => { leftContent.setWithHistory(''); setLeftFileName('untitled.' + (leftMode === 'json' ? 'json' : leftMode === 'xml' ? 'xml' : 'txt')); }}
                                        onSave={() => handleSave('left')}
                                        onToggleWordWrap={() => setSettings(s => ({ ...s, editor: { ...s.editor, wordWrap: !s.editor.wordWrap } }))}
                                        onFileNameChange={setLeftFileName}
                                        schemaErrors={leftSchemaErrors}
                                    />
                                ) : (
                                    <XmlEditor
                                        label="Left"
                                        value={leftContent.state}
                                        onChange={(val) => {
                                            // Detect mode on type if empty start
                                            if (!leftContent.state) {
                                                const t = val.trim();
                                                if (t.startsWith('{') || t.startsWith('[')) setLeftMode('json');
                                                else if (t.startsWith('<')) setLeftMode('xml');
                                                else if (t) setLeftMode('text');
                                            }
                                            handleLeftChange(val);
                                        }}
                                        error={leftError}
                                        onUpload={(f) => handleUpload('left', f)}
                                        onClear={() => { leftContent.setWithHistory(''); setLeftFileName('untitled.' + (leftMode === 'json' ? 'json' : leftMode === 'xml' ? 'xml' : 'txt')); }}
                                        settings={settings}
                                        onToggleWordWrap={() => setSettings(s => ({ ...s, editor: { ...s.editor, wordWrap: !s.editor.wordWrap } }))}
                                        schemaErrors={leftSchemaErrors}
                                        onFormat={(xml) => leftMode === 'json' ? formatJSON(xml) : leftMode === 'xml' ? formatXML(xml, settings) : formatText(xml)}
                                        onSave={() => handleSave('left')}
                                        onFileNameChange={setLeftFileName}
                                        onUndo={leftContent.undo}
                                        onRedo={leftContent.redo}
                                        mode={leftMode}
                                    />
                                )}
                            </div>
                            <div className={clsx("h-full bg-slate-950 p-2 overflow-hidden", settings.editor.fontSize === 'xs' ? 'text-xs' : settings.editor.fontSize === 'sm' ? 'text-sm' : settings.editor.fontSize === 'lg' ? 'text-lg' : 'text-base')}>
                                {useMonaco ? (
                                    <MonacoEditorWrapper
                                        label="Right"
                                        language={rightMode}
                                        value={rightContent.state}
                                        onChange={(val) => {
                                            if (!rightContent.state) {
                                                const t = val.trim();
                                                if (t.startsWith('{') || t.startsWith('[')) setRightMode('json');
                                                else if (t.startsWith('<')) setRightMode('xml');
                                                else if (t) setRightMode('text');
                                            }
                                            rightContent.setState(val);
                                        }}
                                        settings={settings}
                                        error={rightError}
                                        onUpload={(f) => handleUpload('right', f)}
                                        onClear={() => { rightContent.setWithHistory(''); setRightFileName('untitled.' + (rightMode === 'json' ? 'json' : rightMode === 'xml' ? 'xml' : 'txt')); }}
                                        onSave={() => handleSave('right')}
                                        onToggleWordWrap={() => setSettings(s => ({ ...s, editor: { ...s.editor, wordWrap: !s.editor.wordWrap } }))}
                                        onFileNameChange={setRightFileName}
                                        schemaErrors={rightSchemaErrors}
                                    />
                                ) : (
                                    <XmlEditor
                                        label="Right"
                                        value={rightContent.state}
                                        onChange={(val) => {
                                            if (!rightContent.state) {
                                                const t = val.trim();
                                                if (t.startsWith('{') || t.startsWith('[')) setRightMode('json');
                                                else if (t.startsWith('<')) setRightMode('xml');
                                                else if (t) setRightMode('text');
                                            }
                                            handleRightChange(val);
                                        }}
                                        error={rightError}
                                        onUpload={(f) => handleUpload('right', f)}
                                        onClear={() => { rightContent.setWithHistory(''); setRightFileName('untitled.' + (rightMode === 'json' ? 'json' : rightMode === 'xml' ? 'xml' : 'txt')); }}
                                        settings={settings}
                                        onToggleWordWrap={() => setSettings(s => ({ ...s, editor: { ...s.editor, wordWrap: !s.editor.wordWrap } }))}
                                        schemaErrors={rightSchemaErrors}
                                        onFormat={(xml) => rightMode === 'json' ? formatJSON(xml) : rightMode === 'xml' ? formatXML(xml, settings) : formatText(xml)}
                                        onSave={() => handleSave('right')}
                                        onFileNameChange={setRightFileName}
                                        onUndo={rightContent.undo}
                                        onRedo={rightContent.redo}
                                        mode={rightMode}
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        useMonaco ? (
                            <MonacoDiffWrapper
                                original={(() => {
                                    // Apply semantic sort if enabled
                                    if (semanticDiff) {
                                        try {
                                            return leftMode === 'json' ? sortJSON(leftContent.state) : 
                                                   leftMode === 'xml' ? sortXML(leftContent.state, settings) : 
                                                   sortText(leftContent.state);
                                        } catch { return leftContent.state; }
                                    }
                                    return leftContent.state;
                                })()}
                                modified={(() => {
                                    // Apply semantic sort if enabled
                                    if (semanticDiff) {
                                        try {
                                            return rightMode === 'json' ? sortJSON(rightContent.state) : 
                                                   rightMode === 'xml' ? sortXML(rightContent.state, settings) : 
                                                   sortText(rightContent.state);
                                        } catch { return rightContent.state; }
                                    }
                                    return rightContent.state;
                                })()}
                                language={leftMode} // Assume same language or prefer left
                                settings={settings}
                                diffMode={diffMode}
                                ignoreWhitespace={ignoreWhitespace}
                            />
                        ) : (
                            <DiffView comparison={comparison} loading={isProcessing} />
                        )
                    )}
                </div>
            </div>

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                settings={settings}
                setSettings={setSettings}
                defaultSettings={defaultSettings}
            />
        </div >
    );
}

export default App;
