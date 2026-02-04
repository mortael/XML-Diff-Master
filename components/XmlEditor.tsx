import React, { useRef, useState } from 'react';
import { Upload, X, AlertTriangle, Copy, Check } from 'lucide-react';
import { XmlError } from '../types';

interface XmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  error?: XmlError | null;
  onUpload?: (file: File) => void;
  onClear?: () => void;
}

export const XmlEditor: React.FC<XmlEditorProps> = ({ 
  value, 
  onChange, 
  label, 
  error, 
  onUpload,
  onClear
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

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

  return (
    <div className={`flex flex-col h-full border rounded-lg overflow-hidden bg-slate-900 shadow-md transition-colors ${error ? 'border-red-900/50' : 'border-slate-800'}`}>
      <div className={`flex items-center justify-between px-3 py-2 border-b ${error ? 'bg-red-900/20 border-red-900/30' : 'bg-slate-800 border-slate-700'}`}>
        <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300 text-sm uppercase tracking-wide">{label}</span>
            {error && (
                <div className="flex items-center text-red-400 text-xs gap-1 animate-pulse" title={error.message}>
                    <AlertTriangle size={14} />
                    <span className="truncate max-w-[150px] font-medium">Line {error.line}: Invalid XML</span>
                </div>
            )}
        </div>
        <div className="flex items-center gap-1">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xml,.txt,.json" 
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
      
      <div className="relative flex-1 bg-slate-900">
        <textarea
          className="absolute inset-0 w-full h-full p-3 font-mono text-xs sm:text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 bg-slate-900 text-slate-200 placeholder-slate-600"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Paste ${label} XML here...`}
          spellCheck={false}
        />
      </div>
      
      {error && (
        <div className="px-3 py-1.5 bg-red-900/20 border-t border-red-900/30 text-red-300 text-xs flex items-start gap-2">
           <AlertTriangle size={12} className="mt-0.5 shrink-0" />
           <span>Error at line {error.line}: {error.message}</span>
        </div>
      )}
    </div>
  );
};