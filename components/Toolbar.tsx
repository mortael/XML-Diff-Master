import React from 'react';
import { DiffMode } from '../types';
import { Button } from './Button';
import { AlignLeft, ArrowLeftRight, Check, FileCode, SortAsc, MessageSquareOff } from 'lucide-react';

interface ToolbarProps {
  diffMode: DiffMode;
  setDiffMode: (mode: DiffMode) => void;
  ignoreWhitespace: boolean;
  setIgnoreWhitespace: (val: boolean) => void;
  ignoreBlankLines: boolean;
  setIgnoreBlankLines: (val: boolean) => void;
  ignoreComments: boolean;
  setIgnoreComments: (val: boolean) => void;
  onSort: () => void;
  onPrettify: () => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  hasContent: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  diffMode,
  setDiffMode,
  ignoreWhitespace,
  setIgnoreWhitespace,
  ignoreBlankLines,
  setIgnoreBlankLines,
  ignoreComments,
  setIgnoreComments,
  onSort,
  onPrettify,
  isEditing,
  onToggleEdit,
  hasContent
}) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 bg-slate-900 border-b border-slate-800 gap-3 shadow-sm z-10">
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent flex items-center gap-2">
                <FileCode className="text-indigo-400" />
                XML Diff
            </h1>
            
            <div className="h-6 w-px bg-slate-800 hidden md:block"></div>
            
            <div className="flex items-center bg-slate-950 rounded-md p-1 border border-slate-800">
                {(['lines', 'words', 'chars'] as DiffMode[]).map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setDiffMode(mode)}
                        className={`px-3 py-1 text-xs font-medium rounded capitalize transition-all ${
                            diffMode === mode 
                            ? 'bg-slate-800 text-indigo-300 shadow-sm border border-slate-700' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {mode}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none px-2 hover:text-indigo-300 transition-colors" title="Ignore leading/trailing whitespace">
                <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${ignoreWhitespace ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600 bg-slate-800'}`}>
                    {ignoreWhitespace && <Check size={10} className="text-white" />}
                </div>
                <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={ignoreWhitespace} 
                    onChange={(e) => setIgnoreWhitespace(e.target.checked)} 
                />
                Trim Space
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none px-2 hover:text-indigo-300 transition-colors" title="Ignore blank lines">
                <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${ignoreBlankLines ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600 bg-slate-800'}`}>
                    {ignoreBlankLines && <Check size={10} className="text-white" />}
                </div>
                <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={ignoreBlankLines} 
                    onChange={(e) => setIgnoreBlankLines(e.target.checked)} 
                />
                No Blanks
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none px-2 hover:text-indigo-300 transition-colors" title="Ignore XML comments">
                <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${ignoreComments ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600 bg-slate-800'}`}>
                    {ignoreComments && <Check size={10} className="text-white" />}
                </div>
                <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={ignoreComments} 
                    onChange={(e) => setIgnoreComments(e.target.checked)} 
                />
                No Comments
            </label>

            <div className="h-6 w-px bg-slate-800 hidden md:block"></div>

            <Button onClick={onPrettify} title="Format XML" size="sm" disabled={!hasContent}>
                <AlignLeft size={16} className="mr-1.5" />
                Format
            </Button>
            <Button onClick={onSort} title="Sort keys alphabetically" size="sm" disabled={!hasContent}>
                <SortAsc size={16} className="mr-1.5" />
                Sort
            </Button>

            <div className="h-6 w-px bg-slate-800 hidden md:block"></div>

            <Button 
                onClick={onToggleEdit} 
                variant={isEditing ? 'primary' : 'secondary'}
                size="sm"
                className="min-w-[100px]"
            >
                <ArrowLeftRight size={16} className="mr-1.5" />
                {isEditing ? 'Compare' : 'Edit Inputs'}
            </Button>
        </div>
    </div>
  );
};