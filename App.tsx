import React, { useState, useEffect, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { XmlEditor } from './components/XmlEditor';
import { DiffView } from './components/DiffView';
import { validateXML, formatXML, sortXML, isMinified } from './services/xmlService';
import { computeDiff } from './services/diffService';
import { DiffMode, ComparisonResult, XmlError } from './types';

const App: React.FC = () => {
  // State
  const [leftContent, setLeftContent] = useState<string>('');
  const [rightContent, setRightContent] = useState<string>('');
  
  const [leftError, setLeftError] = useState<XmlError | null>(null);
  const [rightError, setRightError] = useState<XmlError | null>(null);

  const [diffMode, setDiffMode] = useState<DiffMode>('lines');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState<boolean>(false);
  const [ignoreBlankLines, setIgnoreBlankLines] = useState<boolean>(false);
  const [ignoreComments, setIgnoreComments] = useState<boolean>(false);
  
  const [comparison, setComparison] = useState<ComparisonResult>({
    leftLines: [],
    rightLines: [],
    unifiedLines: [],
    diffMode: 'lines'
  });
  
  const [viewState, setViewState] = useState<'EDIT' | 'DIFF'>('EDIT');
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-validation
  useEffect(() => {
    const t = setTimeout(() => setLeftError(validateXML(leftContent)), 500);
    return () => clearTimeout(t);
  }, [leftContent]);

  useEffect(() => {
    const t = setTimeout(() => setRightError(validateXML(rightContent)), 500);
    return () => clearTimeout(t);
  }, [rightContent]);

  // Pre-process Logic (Minified detection)
  const handleContentChange = (side: 'left' | 'right', text: string) => {
    let finalVal = text;
    // Check minified
    if (isMinified(text)) {
        const formatted = formatXML(text);
        if (formatted !== text) {
            finalVal = formatted;
        }
    }

    if (side === 'left') setLeftContent(finalVal);
    else setRightContent(finalVal);
  };

  const handleUpload = (side: 'left' | 'right', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) handleContentChange(side, text);
    };
    reader.readAsText(file);
  };

  const executeDiff = useCallback(() => {
    setIsProcessing(true);
    setTimeout(() => {
        const result = computeDiff(
            leftContent, 
            rightContent, 
            diffMode, 
            ignoreWhitespace, 
            ignoreBlankLines,
            ignoreComments
        );
        setComparison(result);
        setIsProcessing(false);
    }, 10);
  }, [leftContent, rightContent, diffMode, ignoreWhitespace, ignoreBlankLines, ignoreComments]);

  // If we are in DIFF view, re-run diff when options change
  useEffect(() => {
    if (viewState === 'DIFF') {
        executeDiff();
    }
  }, [diffMode, ignoreWhitespace, ignoreBlankLines, ignoreComments, viewState, executeDiff]);

  const handleToggleView = () => {
      if (viewState === 'EDIT') {
          setViewState('DIFF');
          // executeDiff triggered by useEffect
      } else {
          setViewState('EDIT');
      }
  };

  const handleSort = () => {
    try {
        if (leftContent) setLeftContent(sortXML(leftContent));
        if (rightContent) setRightContent(sortXML(rightContent));
    } catch (e) {
        alert("Could not sort XML. Please ensure it is valid.");
    }
  };

  const handlePrettify = () => {
      if (leftContent) setLeftContent(formatXML(leftContent));
      if (rightContent) setRightContent(formatXML(rightContent));
  };

  const hasContent = !!(leftContent || rightContent);

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      <Toolbar 
        diffMode={diffMode} 
        setDiffMode={setDiffMode}
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

      <div className="flex-1 overflow-hidden relative">
        {viewState === 'EDIT' && (
             <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                <XmlEditor 
                    label="Original / Left" 
                    value={leftContent} 
                    onChange={(val) => handleContentChange('left', val)} 
                    error={leftError}
                    onUpload={(f) => handleUpload('left', f)}
                    onClear={() => setLeftContent('')}
                    onFormat={() => setLeftContent(formatXML(leftContent))}
                />
                <XmlEditor 
                    label="Modified / Right" 
                    value={rightContent} 
                    onChange={(val) => handleContentChange('right', val)} 
                    error={rightError}
                    onUpload={(f) => handleUpload('right', f)}
                    onClear={() => setRightContent('')}
                    onFormat={() => setRightContent(formatXML(rightContent))}
                />
             </div>
        )}

        {viewState === 'DIFF' && (
            <DiffView comparison={comparison} loading={isProcessing} />
        )}
      </div>
      
      {/* Helper message */}
      {viewState === 'EDIT' && !hasContent && (
          <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
              <span className="bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full text-slate-400 text-sm shadow-lg border border-slate-700">
                Paste XML content or drag & drop files to start
              </span>
          </div>
      )}
    </div>
  );
};

export default App;