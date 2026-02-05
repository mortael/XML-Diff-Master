import { Settings, X, RotateCcw } from 'lucide-react';
import { Settings as SettingsType } from '../utils/xml';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: SettingsType;
    setSettings: React.Dispatch<React.SetStateAction<SettingsType>>;
    defaultSettings: SettingsType;
}

export const SettingsModal = ({ isOpen, onClose, settings, setSettings, defaultSettings }: SettingsModalProps) => {
    if (!isOpen) return null;

    const updateColor = (key: string, value: string) => {
        setSettings(s => ({ ...s, colors: { ...s.colors, [key]: value } }));
    };

    const updateEditor = (key: string, value: any) => {
        setSettings(s => ({ ...s, editor: { ...s.editor, [key]: value } }));
    };

    const updateDiff = (key: string, value: any) => {
        setSettings(s => ({ ...s, diff: { ...s.diff, [key]: value } }));
    };

    const resetToDefaults = () => setSettings(defaultSettings);

    const ColorInput = ({ label, colorKey }: { label: string, colorKey: string }) => (
        <div className="flex items-center justify-between py-2">
            <span className="text-slate-300 text-sm">{label}</span>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={settings.colors[colorKey]}
                    onChange={(e) => updateColor(colorKey, e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-600"
                />
                <input
                    type="text"
                    value={settings.colors[colorKey]}
                    onChange={(e) => updateColor(colorKey, e.target.value)}
                    className="w-20 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-200 font-mono"
                />
            </div>
        </div>
    );

    const Toggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
        <div className="flex items-center justify-between py-2">
            <span className="text-slate-300 text-sm">{label}</span>
            <button
                onClick={() => onChange(!checked)}
                className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-slate-600'}`}
            >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                        <Settings size={20} /> Settings
                    </h2>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[60vh] px-5 py-4 space-y-6">
                    {/* Syntax Colors */}
                    <div>
                        <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide mb-3">Syntax Highlighting Colors</h3>
                        <div className="space-y-1 bg-slate-900/50 rounded-lg p-3">
                            <ColorInput label="Tag Brackets" colorKey="tagBracket" />
                            <ColorInput label="Tag Names" colorKey="tagName" />
                            <ColorInput label="Attribute Names" colorKey="attrName" />
                            <ColorInput label="Attribute Values" colorKey="attrValue" />
                            <ColorInput label="Comments" colorKey="comment" />
                            <ColorInput label="Text Content" colorKey="text" />
                        </div>
                    </div>

                    {/* Editor Settings */}
                    <div>
                        <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide mb-3">Editor Settings</h3>
                        <div className="space-y-1 bg-slate-900/50 rounded-lg p-3">
                            <div className="flex items-center justify-between py-2">
                                <span className="text-slate-300 text-sm">Font Size</span>
                                <select
                                    value={settings.editor.fontSize}
                                    onChange={(e) => updateEditor('fontSize', e.target.value)}
                                    className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-slate-200"
                                >
                                    <option value="xs">Extra Small</option>
                                    <option value="sm">Small</option>
                                    <option value="base">Medium</option>
                                    <option value="lg">Large</option>
                                </select>
                            </div>
                            <Toggle label="Word Wrap" checked={settings.editor.wordWrap} onChange={(v) => updateEditor('wordWrap', v)} />

                            <div className="flex items-center justify-between py-2">
                                <span className="text-slate-300 text-sm">Auto-format</span>
                                <select
                                    value={settings.editor.autoFormat === true ? 'paste' : (settings.editor.autoFormat || 'none')}
                                    onChange={(e) => updateEditor('autoFormat', e.target.value)}
                                    className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-slate-200"
                                >
                                    <option value="none">None</option>
                                    <option value="paste">On Paste</option>
                                    <option value="always">Always (Paste/Load)</option>
                                </select>
                            </div>

                            <div className="pt-2 border-t border-slate-700/50 mt-2">
                                <Toggle
                                    label="Normalize Mixed Content"
                                    checked={settings.editor.normalizeWhitespace}
                                    onChange={(v) => updateEditor('normalizeWhitespace', v)}
                                />
                                <p className="text-[10px] text-slate-500 mt-0.5 ml-0.5">Collapse whitespace in mixed content to single spaces.</p>
                            </div>
                        </div>
                    </div>

                    {/* Diff Settings */}
                    <div>
                        <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide mb-3">Diff Settings</h3>
                        <div className="space-y-1 bg-slate-900/50 rounded-lg p-3">
                            <Toggle label="Show Line Numbers" checked={settings.diff.showLineNumbers} onChange={(v) => updateDiff('showLineNumbers', v)} />
                            <div className="flex items-center justify-between py-2">
                                <span className="text-slate-300 text-sm">Context Lines</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={settings.diff.contextLines}
                                    onChange={(e) => updateDiff('contextLines', parseInt(e.target.value) || 0)}
                                    className="w-16 bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-slate-200 text-center"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700 bg-slate-800/50">
                    <button
                        onClick={resetToDefaults}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                    >
                        <RotateCcw size={16} /> Reset to Defaults
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
