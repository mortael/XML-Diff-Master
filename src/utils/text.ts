import type { Settings } from "./xml";

/**
 * Validates text content (always valid for plain text)
 */
export const validateText = (
  _text: string
): { message: string; line: number } | null => {
  // Plain text is always valid
  return null;
};

/**
 * Formats text content (currently a no-op, but could add trimming or line normalization)
 */
export const formatText = (text: string): string => {
  // For plain text, we don't apply any formatting
  // Users can work with it as-is
  return text;
};

/**
 * Sorts text content by lines alphabetically
 */
export const sortText = (text: string): string => {
  if (!text.trim()) return "";

  const lines = text.split("\n");
  const sortedLines = lines.sort((a, b) => a.localeCompare(b));
  return sortedLines.join("\n");
};

/**
 * Highlights text content (no special highlighting for plain text)
 */
export const highlightText = (
  text: string,
  colors: Settings["colors"]
): string => {
  if (!text) return "";

  // Simple HTML escaping for plain text display
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // Return text with default color
  return `<span style="color:${colors.text}">${escapeHtml(text)}</span>`;
};
