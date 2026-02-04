export type DiffMode = 'lines' | 'words' | 'chars';
export type ViewType = 'split' | 'unified';

export interface DiffOptions {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  newlineIsToken?: boolean;
}

export interface XmlError {
  line?: number;
  message: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'phantom';
  value: string;
  lineNumber?: number;
}

export interface UnifiedLine {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface ComparisonResult {
  leftLines: DiffLine[];
  rightLines: DiffLine[];
  unifiedLines: UnifiedLine[];
  diffMode: DiffMode;
}

export enum ViewMode {
  EDIT = 'EDIT',
  DIFF = 'DIFF'
}