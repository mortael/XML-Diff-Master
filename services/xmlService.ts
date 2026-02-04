import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';
import { XmlError } from '../types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseTagValue: false, // Keep values as strings to avoid data loss during sort
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  indentBy: "  ",
});

export const validateXML = (xml: string): XmlError | null => {
  if (!xml.trim()) return null;
  
  const result = XMLValidator.validate(xml);
  if (result === true) return null;
  
  return {
    message: result.err.msg,
    line: result.err.line
  };
};

export const formatXML = (xml: string): string => {
  try {
    if (!xml.trim()) return '';
    // If it's already valid, we can parse and rebuild to pretty print
    // However, fast-xml-parser's builder is best for objects.
    // A quick way to format existing XML string if we don't want to change structure:
    const jsonObj = parser.parse(xml);
    return builder.build(jsonObj);
  } catch (e) {
    console.error("Format error", e);
    return xml; // Return original if fail
  }
};

const sortObject = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((result: any, key) => {
        result[key] = sortObject(obj[key]);
        return result;
      }, {});
  }
  return obj;
};

export const sortXML = (xml: string): string => {
  try {
    if (!xml.trim()) return '';
    const jsonObj = parser.parse(xml);
    const sortedObj = sortObject(jsonObj);
    return builder.build(sortedObj);
  } catch (e) {
    console.error("Sort error", e);
    throw new Error("Failed to sort XML. Ensure it is valid first.");
  }
};

export const isMinified = (xml: string): boolean => {
  const trimmed = xml.trim();
  return trimmed.length > 50 && !trimmed.includes('\n');
};