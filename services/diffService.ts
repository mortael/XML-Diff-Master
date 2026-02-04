import * as Diff from 'diff';
import { DiffMode, DiffLine, ComparisonResult, UnifiedLine } from '../types';

export const computeDiff = (
  oldText: string,
  newText: string,
  mode: DiffMode,
  ignoreWhitespace: boolean,
  ignoreBlankLines: boolean,
  ignoreComments: boolean
): ComparisonResult => {
  const options = { ignoreWhitespace };
  
  let finalOld = oldText;
  let finalNew = newText;

  // Pre-process for ignoreComments
  if (ignoreComments) {
      const commentRegex = /<!--[\s\S]*?-->/g;
      finalOld = finalOld.replace(commentRegex, '');
      finalNew = finalNew.replace(commentRegex, '');
  }

  // Pre-process for ignoreBlankLines
  // If we ignore blank lines, we strip them from the input before diffing
  if (ignoreBlankLines) {
      finalOld = finalOld.split('\n').filter(l => l.trim() !== '').join('\n');
      finalNew = finalNew.split('\n').filter(l => l.trim() !== '').join('\n');
  }
  
  const changes = Diff.diffLines(finalOld, finalNew, { ...options, newlineIsToken: false });
  
  const leftLines: DiffLine[] = [];
  const rightLines: DiffLine[] = [];
  const unifiedLines: UnifiedLine[] = [];
  
  let leftLineNum = 1;
  let rightLineNum = 1;
  let unifiedOldLineNum = 1;
  let unifiedNewLineNum = 1;

  // --- Calculate Unified Lines ---
  changes.forEach(change => {
    const lines = change.value.replace(/\n$/, '').split('\n');
    if (change.value.endsWith('\n') && lines[lines.length - 1] === '') lines.pop();

    lines.forEach(line => {
      if (change.removed) {
        unifiedLines.push({ 
          type: 'removed', 
          value: line, 
          oldLineNumber: unifiedOldLineNum++ 
        });
      } else if (change.added) {
        unifiedLines.push({ 
          type: 'added', 
          value: line, 
          newLineNumber: unifiedNewLineNum++ 
        });
      } else {
        unifiedLines.push({ 
          type: 'unchanged', 
          value: line, 
          oldLineNumber: unifiedOldLineNum++, 
          newLineNumber: unifiedNewLineNum++ 
        });
      }
    });
  });

  // --- Calculate Split/Side-by-Side Lines ---
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const lines = change.value.replace(/\n$/, '').split('\n'); 
    
    if (change.value.endsWith('\n') && lines[lines.length - 1] === '') {
        lines.pop();
    }
    
    // LOOKAHEAD for Replacements (Removed followed immediately by Added)
    if (change.removed && i + 1 < changes.length && changes[i + 1].added) {
      const nextChange = changes[i + 1];
      const nextLines = nextChange.value.replace(/\n$/, '').split('\n');
      if (nextChange.value.endsWith('\n') && nextLines[nextLines.length - 1] === '') nextLines.pop();

      const maxCount = Math.max(lines.length, nextLines.length);

      for (let j = 0; j < maxCount; j++) {
        if (j < lines.length) {
          leftLines.push({ type: 'removed', value: lines[j], lineNumber: leftLineNum++ });
        } else {
          leftLines.push({ type: 'phantom', value: '', lineNumber: undefined });
        }

        if (j < nextLines.length) {
          rightLines.push({ type: 'added', value: nextLines[j], lineNumber: rightLineNum++ });
        } else {
          rightLines.push({ type: 'phantom', value: '', lineNumber: undefined });
        }
      }
      
      i++; 
      continue;
    }

    if (change.removed) {
      lines.forEach(line => {
        leftLines.push({ type: 'removed', value: line, lineNumber: leftLineNum++ });
        rightLines.push({ type: 'phantom', value: '', lineNumber: undefined });
      });
    }
    else if (change.added) {
      lines.forEach(line => {
        leftLines.push({ type: 'phantom', value: '', lineNumber: undefined });
        rightLines.push({ type: 'added', value: line, lineNumber: rightLineNum++ });
      });
    }
    else {
      lines.forEach(line => {
        leftLines.push({ type: 'unchanged', value: line, lineNumber: leftLineNum++ });
        rightLines.push({ type: 'unchanged', value: line, lineNumber: rightLineNum++ });
      });
    }
  }

  return { leftLines, rightLines, unifiedLines, diffMode: mode };
};

export const getIntraLineDiff = (oldLine: string, newLine: string, mode: DiffMode) => {
    if (mode === 'lines') return null;
    if (mode === 'words') return Diff.diffWords(oldLine, newLine);
    return Diff.diffChars(oldLine, newLine);
};