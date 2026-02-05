import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings as SettingsIcon, FileCode, SplitSquareHorizontal, CheckCircle } from 'lucide-react';
import { useUndo } from './hooks/useUndo';
import { Toolbar } from './components/Toolbar';
import { XmlEditor } from './components/XmlEditor';
import { DiffView } from './components/DiffView';
import { SettingsModal } from './components/SettingsModal';
import { validateXML, formatXML, sortXML, isMinified, validateAgainstSchema, Settings } from './utils/xml';
import { computeDiff, ComparisonResult } from './utils/diff';
import { clsx } from 'clsx';
import { Button } from './components/ui/Button';

function App() {
    const leftContent = useUndo('');
    const rightContent = useUndo('');

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
            wordWrap: true,
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
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch { return defaultSettings; }
    });

    useEffect(() => {
        try { localStorage.setItem('xmldiff-settings', JSON.stringify(settings)); } catch { }
    }, [settings]);

    useEffect(() => {
        const t = setTimeout(() => setLeftError(validateXML(leftContent.state)), 500);
        return () => clearTimeout(t);
    }, [leftContent.state]);

    useEffect(() => {
        const t = setTimeout(() => setRightError(validateXML(rightContent.state)), 500);
        return () => clearTimeout(t);
    }, [rightContent.state]);

    // Schema validation effects
    useEffect(() => {
        if (xsdSchema && leftContent.state) {
            const result = validateAgainstSchema(leftContent.state, xsdSchema);
            setLeftSchemaErrors(result.errors);
        } else {
            setLeftSchemaErrors([]);
        }
    }, [leftContent.state, xsdSchema]);

    useEffect(() => {
        if (xsdSchema && rightContent.state) {
            const result = validateAgainstSchema(rightContent.state, xsdSchema);
            setRightSchemaErrors(result.errors);
        } else {
            setRightSchemaErrors([]);
        }
    }, [rightContent.state, xsdSchema]);

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

    const handleContentChange = (side: 'left' | 'right', text: string) => {
        let finalVal = text;
        if (isMinified(text)) {
            const formatted = formatXML(text);
            if (formatted !== text) {
                finalVal = formatted;
            }
        }

        if (side === 'left') {
            leftContent.setWithHistory(finalVal);
        } else {
            rightContent.setWithHistory(finalVal);
        }
    };

    const handleUpload = async (side: 'left' | 'right', file: File) => {
        try {
            let text = await file.text();

            if (settings?.editor?.autoFormat === 'always') {
                text = formatXML(text, settings);
            }

            handleContentChange(side, text);
            if (side === 'left') setLeftFileName(file.name);
            else setRightFileName(file.name);
        } catch (e) {
            alert("Failed to read file");
        }
    };

    const handleSave = (side: 'left' | 'right') => {
        const content = side === 'left' ? leftContent.state : rightContent.state;
        if (!content) return;
        const name = side === 'left' ? leftFileName : rightFileName;
        const blob = new Blob([content], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name || 'untitled.xml';
        a.click();
        URL.revokeObjectURL(url);
    };

    const executeDiff = useCallback(() => {
        setIsProcessing(true);
        setTimeout(() => {
            const result = computeDiff(
                leftContent.state,
                rightContent.state,
                diffMode,
                ignoreWhitespace,
                ignoreBlankLines,
                ignoreComments
            );
            setComparison(result);
            setIsProcessing(false);
        }, 10);
    }, [leftContent.state, rightContent.state, diffMode, ignoreWhitespace, ignoreBlankLines, ignoreComments]);

    useEffect(() => {
        if (viewState === 'DIFF') {
            executeDiff();
        }
    }, [diffMode, ignoreWhitespace, ignoreBlankLines, ignoreComments, viewState, executeDiff]);

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
            if ((s === 'left' || s === 'both') && leftContent.state) leftContent.setWithHistory(sortXML(leftContent.state, settings));
            if ((s === 'right' || s === 'both') && rightContent.state) rightContent.setWithHistory(sortXML(rightContent.state, settings));
        } catch (e) {
            alert("Could not sort XML. Please ensure it is valid.");
        }
    };

    const handlePrettify = (side?: 'left' | 'right' | 'both') => {
        const s = (typeof side === 'string' ? side : 'both');
        if ((s === 'left' || s === 'both') && leftContent.state) leftContent.setWithHistory(formatXML(leftContent.state, settings));
        if ((s === 'right' || s === 'both') && rightContent.state) rightContent.setWithHistory(formatXML(rightContent.state, settings));
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
                    onSort={handleSort}
                    onPrettify={handlePrettify}
                    isEditing={viewState === 'EDIT'}
                    onToggleEdit={handleToggleView}
                    hasContent={hasContent}
                />

                <div className="flex items-center gap-2 pr-4 bg-slate-900 h-full border-l border-slate-800">
                    <Button
                        onClick={() => setShowSchemaPanel(!showSchemaPanel)}
                        size="sm"
                        variant={showSchemaPanel ? 'primary' : 'ghost'}
                        className={showSchemaPanel ? '' : 'text-amber-400 hover:bg-amber-900/20 hover:text-amber-300'}
                        title="XSD Schema Validation"
                    >
                        <FileCode size={16} className="mr-1.5" />
                        Schema
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
                            <textarea
                                value={xsdSchema}
                                onChange={(e) => setXsdSchema(e.target.value)}
                                placeholder="Paste XSD Schema here to validate both XML inputs..."
                                className="w-full h-32 bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 resize-none"
                            />
                            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                                <span>Validation is performed automatically as you type.</span>
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
                                <XmlEditor
                                    label="Left"
                                    value={leftContent.state}
                                    onChange={handleLeftChange}
                                    error={leftError}
                                    onUpload={(f) => handleUpload('left', f)}
                                    onClear={() => { leftContent.setWithHistory(''); setLeftFileName('untitled.xml'); }}
                                    settings={settings}
                                    schemaErrors={leftSchemaErrors}
                                    onFormat={(xml) => formatXML(xml, settings)}
                                    onSave={() => handleSave('left')}
                                    onFileNameChange={setLeftFileName}
                                    onUndo={leftContent.undo}
                                    onRedo={leftContent.redo}
                                />
                            </div>
                            <div className={clsx("h-full bg-slate-950 p-2 overflow-hidden", settings.editor.fontSize === 'xs' ? 'text-xs' : settings.editor.fontSize === 'sm' ? 'text-sm' : settings.editor.fontSize === 'lg' ? 'text-lg' : 'text-base')}>
                                <XmlEditor
                                    label="Right"
                                    value={rightContent.state}
                                    onChange={handleRightChange}
                                    error={rightError}
                                    onUpload={(f) => handleUpload('right', f)}
                                    onClear={() => { rightContent.setWithHistory(''); setRightFileName('untitled.xml'); }}
                                    settings={settings}
                                    schemaErrors={rightSchemaErrors}
                                    onFormat={(xml) => formatXML(xml, settings)}
                                    onSave={() => handleSave('right')}
                                    onFileNameChange={setRightFileName}
                                    onUndo={rightContent.undo}
                                    onRedo={rightContent.redo}
                                />
                            </div>
                        </div>
                    ) : (
                        <DiffView comparison={comparison} loading={isProcessing} />
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
        </div>
    );
}

export default App;
