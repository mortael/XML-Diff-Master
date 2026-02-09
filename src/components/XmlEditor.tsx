import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  Download,
  FileCode,
  FolderTree,
  Search,
  Upload,
  WrapText,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { highlightJSON } from "../utils/json";
import { highlightXML, type Settings } from "../utils/xml";
import { highlightText } from "../utils/text";
import { TreeView } from "./TreeView";

interface XmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  error: { line: number; message: string } | null;
  onUpload?: (file: File) => void;
  onClear: () => void;
  settings: Settings;
  onToggleWordWrap?: () => void;
  schemaErrors?: { line: number; message: string }[];
  onFormat: (xml: string) => string;
  onSave: () => void;
  onFileNameChange: (name: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  mode: "xml" | "json" | "text";
}

export const XmlEditor = ({
  value,
  onChange,
  label,
  error,
  onUpload,
  onClear,
  settings,
  onToggleWordWrap,
  schemaErrors = [],
  onFormat,
  onSave,
  onFileNameChange,
  onUndo,
  onRedo,
  mode,
}: XmlEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [viewMode, setViewMode] = useState<"code" | "tree">("code");
  const [lineHeights, setLineHeights] = useState<number[]>([]);

  const lineNumbers = useMemo(() => {
    if (!value) return [1];
    return Array.from({ length: value.split("\n").length }, (_, i) => i + 1);
  }, [value]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const af = settings?.editor?.autoFormat;
    const shouldFormat = af === true || af === "paste" || af === "always";

    if (shouldFormat) {
      const pasted = e.clipboardData.getData("text");
      const trimmed = pasted.trim();
      if (
        trimmed.startsWith("<") ||
        trimmed.startsWith("{") ||
        trimmed.startsWith("[")
      ) {
        e.preventDefault();
        const formatted = onFormat(pasted);

        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        const before = value.substring(0, start);
        const after = value.substring(end);

        if (value) {
          onChange(before + formatted + after);
        } else {
          onChange(formatted);
        }

        if (onFileNameChange) onFileNameChange("untitled.xml");
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
      console.error("Failed to copy", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

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
    const lineNumEl = document.getElementById(
      `linenums-${label.replace(/\s/g, "")}`
    );
    if (lineNumEl) {
      lineNumEl.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const jumpToLine = (lineNum: number) => {
    if (!textareaRef.current) return;
    const lines = value.split("\n");
    let charPos = 0;
    for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
      charPos += lines[i].length + 1;
    }
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(
      charPos,
      charPos + (lines[lineNum - 1]?.length || 0)
    );

    const lineHeight = 20;
    textareaRef.current.scrollTop = (lineNum - 5) * lineHeight;
  };

  useEffect(() => {
    if (!(searchQuery && value)) {
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
    const prev =
      (currentMatch - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatch(prev);
    goToMatch(prev);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useLayoutEffect(() => {
    if (!(settings?.editor?.wordWrap && measureRef.current)) {
      setLineHeights([]);
      return;
    }

    const measure = () => {
      if (!measureRef.current) return;
      const children = Array.from(measureRef.current.children);
      const heights = children.map(
        (child) => child.getBoundingClientRect().height
      );
      setLineHeights(heights);
    };

    measure();

    // Optional: ResizeObserver to handle window resize events that might change wrapping
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(measureRef.current);

    return () => resizeObserver.disconnect();
  }, [value, settings?.editor?.wordWrap, viewMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo?.();
        } else {
          onUndo?.();
        }
      } else if (e.key === "y") {
        e.preventDefault();
        onRedo?.();
      }
    }
  };

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-lg border bg-slate-900 shadow-md transition-colors ${isDragging ? "border-2 border-indigo-500" : error ? "border-red-900/50" : "border-slate-800"}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className={`flex items-center justify-between border-b px-3 py-2 ${error ? "border-red-900/30 bg-red-900/20" : "border-slate-700 bg-slate-800"}`}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300 text-sm uppercase tracking-wide">
            {label}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${mode === "json" ? "bg-yellow-900/40 text-yellow-500" : "bg-blue-900/40 text-blue-400"}`}
          >
            {mode.toUpperCase()}
          </span>
          {error && (
            <button
              className="flex animate-pulse cursor-pointer items-center gap-1 text-red-400 text-xs hover:text-red-300"
              onClick={() => jumpToLine(error.line)}
              title={`Click to jump to line ${error.line}`}
            >
              <AlertTriangle size={14} />
              <span className="max-w-[150px] truncate font-medium underline">
                Line {error.line}: Invalid XML
              </span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            className={`rounded p-1.5 transition-colors ${viewMode === "tree" ? "bg-indigo-900/30 text-indigo-300" : "text-slate-400 hover:bg-slate-700 hover:text-indigo-400"}`}
            onClick={() => setViewMode(viewMode === "code" ? "tree" : "code")}
            title={
              viewMode === "code"
                ? "Switch to Tree View"
                : "Switch to Code View"
            }
          >
            {viewMode === "code" ? (
              <FolderTree size={16} />
            ) : (
              <Code size={16} />
            )}
          </button>

          {onToggleWordWrap && (
            <button
              className={`rounded p-1.5 transition-colors ${settings.editor.wordWrap ? "bg-indigo-900/30 text-indigo-300" : "text-slate-400 hover:bg-slate-700 hover:text-indigo-400"}`}
              onClick={onToggleWordWrap}
              title="Toggle Word Wrap"
            >
              <WrapText size={16} />
            </button>
          )}

          <div className="mx-1 h-4 w-px bg-slate-700" />

          <button
            className={`rounded p-1.5 transition-colors ${showSearch ? "bg-indigo-900/30 text-indigo-400" : "text-slate-400 hover:bg-slate-700 hover:text-indigo-400"}`}
            onClick={() => setShowSearch(!showSearch)}
            title="Search (Ctrl+F)"
          >
            <Search size={16} />
          </button>
          <input
            accept=".xml,.txt,.json,.xsd"
            className="hidden"
            onChange={handleFileUpload}
            ref={fileInputRef}
            type="file"
          />
          <button
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-indigo-400"
            onClick={() => fileInputRef.current?.click()}
            title="Upload File"
          >
            <Upload size={16} />
          </button>

          <button
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-indigo-400"
            disabled={!value}
            onClick={onSave}
            title="Save / Download"
          >
            <Download size={16} />
          </button>

          <button
            className={`rounded p-1.5 transition-colors ${copied ? "bg-green-900/30 text-green-400" : "text-slate-400 hover:bg-slate-700 hover:text-indigo-400"}`}
            disabled={!value}
            onClick={handleCopy}
            title="Copy to Clipboard"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>

          {value && (
            <button
              className="rounded p-1.5 text-slate-500 transition-colors hover:bg-red-900/20 hover:text-red-400"
              onClick={onClear}
              title="Clear"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="flex items-center gap-2 border-slate-700 border-b bg-slate-800/50 px-3 py-2">
          <Search className="text-slate-500" size={14} />
          <input
            autoFocus
            className="flex-1 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-slate-200 text-sm focus:border-indigo-500 focus:outline-none"
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.shiftKey ? prevMatch() : nextMatch();
            }}
            placeholder="Search..."
            type="text"
            value={searchQuery}
          />
          <span className="min-w-[60px] text-slate-500 text-xs">
            {searchMatches.length > 0
              ? `${currentMatch + 1} / ${searchMatches.length}`
              : "No matches"}
          </span>
          <button
            className="p-1 text-slate-400 hover:text-slate-200"
            disabled={searchMatches.length === 0}
            onClick={prevMatch}
          >
            <ChevronUp size={16} />
          </button>
          <button
            className="p-1 text-slate-400 hover:text-slate-200"
            disabled={searchMatches.length === 0}
            onClick={nextMatch}
          >
            <ChevronDown size={16} />
          </button>
          <button
            className="p-1 text-slate-400 hover:text-slate-200"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="relative flex flex-1 overflow-hidden bg-slate-900">
        {viewMode === "code" && (
          <>
            {/* Line Numbers */}
            <div
              className="w-10 shrink-0 select-none overflow-hidden border-slate-800 border-r bg-slate-950 py-3 pr-2 text-right font-mono text-slate-600 text-xs"
              id={`linenums-${label.replace(/\s/g, "")}`}
              style={{ lineHeight: "1.5" }}
            >
              {lineNumbers.map((n, i) => (
                <div
                  key={n}
                  style={{
                    height: lineHeights[i] || "21px", // 1.5 * 14px (text-sm) = 21px approx, need exact
                    lineHeight: lineHeights[i] ? undefined : "1.5",
                  }}
                >
                  {n}
                </div>
              ))}
            </div>

            <div className="relative h-full flex-1 overflow-hidden">
              {isDragging && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded border-2 border-indigo-400 border-dashed bg-indigo-900/30 backdrop-blur-sm">
                  <div className="flex items-center gap-2 font-medium text-indigo-300">
                    <Upload size={24} /> Drop XML file here
                  </div>
                </div>
              )}

              {/* Measurement Container for Word Wrap */}
              <div
                aria-hidden="true"
                className={`pointer-events-none invisible absolute top-0 left-0 m-0 w-full p-3 font-mono ${settings?.editor?.wordWrap ? "whitespace-pre-wrap break-all" : "overflow-auto whitespace-pre"}`}
                ref={measureRef}
                style={{
                  lineHeight: "1.5",
                  height: "auto",
                  overflow: "hidden",
                }}
              >
                {/* We render separate divs for each line to measure height */}
                {value.split("\n").map((line, i) => (
                  <div className="w-full" key={i}>
                    {line || "\u00A0"}
                  </div>
                ))}
              </div>

              <pre
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 m-0 h-full w-full overflow-hidden p-3 font-mono ${settings?.editor?.wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"}`}
                dangerouslySetInnerHTML={{
                  __html:
                    (mode === "json"
                      ? highlightJSON(value, settings?.colors)
                      : mode === "xml"
                      ? highlightXML(value, settings?.colors)
                      : highlightText(value, settings?.colors)) + "\n",
                }}
                ref={preRef}
                style={{ color: "#e2e8f0", lineHeight: "1.5" }}
              />
              <textarea
                className={`absolute inset-0 h-full w-full resize-none bg-transparent p-3 font-mono text-transparent placeholder-slate-600 caret-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${settings?.editor?.wordWrap ? "whitespace-pre-wrap break-all" : "overflow-auto whitespace-pre"}`}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onScroll={handleScroll}
                placeholder={`Paste ${label} ${mode.toUpperCase()} here or drag & drop a file...`}
                ref={textareaRef}
                spellCheck={false}
                style={{ caretColor: "#e2e8f0", lineHeight: "1.5" }}
                value={value}
              />
            </div>
          </>
        )}

        {viewMode === "tree" && (
          <div className="flex-1 overflow-hidden bg-slate-950">
            <TreeView xml={value} />
          </div>
        )}
      </div>

      {error && (
        <button
          className="flex w-full cursor-pointer items-start gap-2 border-red-900/30 border-t bg-red-900/20 px-3 py-1.5 text-left text-red-300 text-xs transition-colors hover:bg-red-900/30"
          onClick={() => jumpToLine(error.line)}
        >
          <AlertTriangle className="mt-0.5 shrink-0" size={12} />
          <span className="underline">
            Click to jump to line {error.line}: {error.message}
          </span>
        </button>
      )}

      {schemaErrors.length > 0 && (
        <div className="max-h-20 overflow-y-auto border-amber-900/30 border-t bg-amber-900/20 px-3 py-1.5 text-amber-300 text-xs">
          <div className="mb-1 flex items-center gap-1 font-medium">
            <FileCode size={12} /> Schema Validation ({schemaErrors.length}{" "}
            issue{schemaErrors.length > 1 ? "s" : ""})
          </div>
          {schemaErrors.slice(0, 5).map((err, i) => (
            <button
              className="block w-full truncate py-0.5 text-left text-amber-400 underline hover:text-amber-200"
              key={i}
              onClick={() => jumpToLine(err.line)}
            >
              Line {err.line}: {err.message}
            </button>
          ))}
          {schemaErrors.length > 5 && (
            <div className="text-amber-500">
              ...and {schemaErrors.length - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  );
};
