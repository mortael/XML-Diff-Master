import React, { useState } from 'react';
import { DiffMode, ComparisonResult, DiffLine, ViewType, UnifiedLine } from '../types';
import { getIntraLineDiff } from '../services/diffService';
import { AlertCircle, Columns, LayoutList, ListOrdered, Hash } from 'lucide-react';
import { clsx } from 'clsx';

interface DiffViewProps {
  comparison: ComparisonResult;
  loading: boolean;
}

const LineContent: React.FC<{ line: DiffLine | UnifiedLine, mate?: DiffLine, mode: DiffMode, type?: 'added' | 'removed' | 'unchanged' | 'phantom' }> = ({ line, mate, mode, type }) => {
  const lineType = type || line.type;
  if (lineType === 'phantom') return <span className="select-none">&nbsp;</span>;
  
  if (mode !== 'lines' && mate && mate.type !== 'phantom' && lineType !== 'unchanged' && mate.type !== 'unchanged') {
     const changes = getIntraLineDiff(
        lineType === 'removed' ? line.value : mate.value, 
        lineType === 'added' ? line.value : mate.value, 
        mode
     );
     
     if (changes) {
       return (
         <span>
           {changes.map((part, idx) => {
             if (lineType === 'removed') {
               if (part.added) return null;
               return <span key={idx} className={part.removed ? "bg-red-500/30 text-red-100 rounded-[1px]" : ""}>{part.value}</span>
             }
             else {
               if (part.removed) return null;
               return <span key={idx} className={part.added ? "bg-green-500/30 text-green-100 rounded-[1px]" : ""}>{part.value}</span>
             }
           })}
         </span>
       );
     }
  }

  return <span className={lineType === 'unchanged' ? 'text-slate-300' : ''}>{line.value || ' '}</span>;
};

export const DiffView: React.FC<DiffViewProps> = ({ comparison, loading }) => {
  const [viewType, setViewType] = useState<ViewType>('split');
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-2"></div>
        Processing...
      </div>
    );
  }

  if (comparison.leftLines.length === 0 && comparison.rightLines.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-slate-500 bg-slate-900/50">
            <AlertCircle className="w-12 h-12 mb-2 opacity-20" />
            <p>No content to compare.</p>
        </div>
      )
  }

  // Use configured colors from index.html (referenced via tailwind classes or custom defined here)
  const getBgColor = (type: string) => {
      if (type === 'removed') {
          return 'bg-diff-del text-diff-delText';
      }
      if (type === 'added') {
          return 'bg-diff-add text-diff-addText';
      }
      return 'text-slate-300';
  };

  const renderSplitView = () => (
    comparison.leftLines.map((leftLine, index) => {
      const rightLine = comparison.rightLines[index];
      const leftBg = getBgColor(leftLine.type);
      const rightBg = getBgColor(rightLine.type);
      
      return (
        <div key={index} className="flex border-b border-slate-800 hover:bg-slate-800/50 font-mono text-xs sm:text-sm">
          {showLineNumbers && (
            <div className="w-8 sm:w-12 shrink-0 select-none bg-slate-900 border-r border-slate-800 text-right pr-2 py-0.5 text-slate-600">
                {leftLine.lineNumber || ''}
            </div>
          )}
          <div className={`flex-1 overflow-x-auto whitespace-pre py-0.5 px-2 ${leftBg}`}>
             <LineContent line={leftLine} mate={rightLine} mode={comparison.diffMode} />
          </div>
          
          {showLineNumbers && (
            <div className="w-8 sm:w-12 shrink-0 select-none bg-slate-900 border-l border-r border-slate-800 text-right pr-2 py-0.5 text-slate-600">
                {rightLine.lineNumber || ''}
            </div>
          )}
          <div className={`flex-1 overflow-x-auto whitespace-pre py-0.5 px-2 ${rightBg}`}>
             <LineContent line={rightLine} mate={leftLine} mode={comparison.diffMode} />
          </div>
        </div>
      );
    })
  );

  const renderUnifiedView = () => (
      comparison.unifiedLines.map((line, index) => {
          const bg = getBgColor(line.type);
          
          return (
            <div key={index} className={`flex border-b border-slate-800 font-mono text-xs sm:text-sm ${bg}`}>
               {showLineNumbers && (
                 <>
                    <div className="w-8 sm:w-10 shrink-0 select-none text-right pr-2 py-0.5 text-slate-600 border-r border-slate-800/50 bg-slate-900">
                        {line.type !== 'added' ? line.oldLineNumber : ''}
                    </div>
                    <div className="w-8 sm:w-10 shrink-0 select-none text-right pr-2 py-0.5 text-slate-600 border-r border-slate-800/50 bg-slate-900">
                        {line.type !== 'removed' ? line.newLineNumber : ''}
                    </div>
                 </>
               )}
               <div className="w-6 shrink-0 select-none text-center py-0.5 text-slate-500 opacity-50">
                    {line.type === 'added' && '+'}
                    {line.type === 'removed' && '-'}
               </div>
               <div className="flex-1 overflow-x-auto whitespace-pre py-0.5 px-2">
                    {line.value || ' '}
               </div>
            </div>
          )
      })
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 shadow-sm overflow-hidden border-t border-slate-800">
        {/* Diff View Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
            <div className="flex bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                <button
                    onClick={() => setViewType('split')}
                    className={clsx(
                        "flex items-center px-3 py-1 text-xs font-medium rounded-md transition-colors",
                        viewType === 'split' ? "bg-slate-800 text-indigo-300 shadow-sm border border-slate-700" : "text-slate-500 hover:text-slate-300"
                    )}
                >
                    <Columns size={14} className="mr-1.5" />
                    Split
                </button>
                <button
                    onClick={() => setViewType('unified')}
                    className={clsx(
                        "flex items-center px-3 py-1 text-xs font-medium rounded-md transition-colors",
                        viewType === 'unified' ? "bg-slate-800 text-indigo-300 shadow-sm border border-slate-700" : "text-slate-500 hover:text-slate-300"
                    )}
                >
                    <LayoutList size={14} className="mr-1.5" />
                    Unified
                </button>
            </div>

            <button 
                onClick={() => setShowLineNumbers(!showLineNumbers)}
                className={clsx(
                    "flex items-center px-2 py-1 text-xs font-medium rounded border transition-colors",
                    showLineNumbers ? "bg-slate-800 border-indigo-900/50 text-indigo-300" : "bg-slate-900 border-slate-700 text-slate-500 hover:bg-slate-800"
                )}
                title="Toggle Line Numbers"
            >
               {showLineNumbers ? <ListOrdered size={14} className="mr-1" /> : <Hash size={14} className="mr-1" />}
               Line Nums
            </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar bg-slate-900">
            <div className="min-w-[600px]">
             {viewType === 'split' ? renderSplitView() : renderUnifiedView()}
            </div>
        </div>
    </div>
  );
};