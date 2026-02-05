export interface ValidationResult {
    valid: boolean;
    errors: { line: number; message: string }[];
}

export interface Settings {
    colors: Record<string, string>;
    editor: {
        fontSize: string;
        wordWrap: boolean;
        autoFormat: boolean | 'paste' | 'always';
        normalizeWhitespace: boolean;
    };
    diff: {
        showLineNumbers: boolean;
        contextLines: number;
    };
}

export const validateXML = (xml: string): { message: string; line: number } | null => {
    if (!xml.trim()) return null;
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            const errorText = parseError.textContent || 'Invalid XML';
            const lineMatch = errorText.match(/line\s*(\d+)/i);
            return {
                message: errorText.split('\n')[0].substring(0, 100),
                line: lineMatch ? parseInt(lineMatch[1]) : 1
            };
        }
        return null;
    } catch (e: any) {
        return { message: e.message, line: 1 };
    }
};

export const formatXML = (xml: string, settings?: Settings): string => {
    try {
        if (!xml.trim()) return '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        if (doc.querySelector('parsererror')) return xml;

        const escapeXml = (str: string) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        const xmlDeclaration = xml.match(/^<\?xml\s+[^?]+\?>/i);

        const hasMixedContent = (node: Node) => {
            return Array.from(node.childNodes).some(c =>
                c.nodeType === Node.TEXT_NODE && (c.textContent?.trim().length || 0) > 0
            );
        };

        const serialize = (node: Node, indent = ''): string => {
            switch (node.nodeType) {
                case Node.ELEMENT_NODE: {
                    const el = node as Element;
                    let result = indent + '<' + el.tagName;
                    for (const attr of Array.from(el.attributes)) {
                        result += ' ' + attr.name + '="' + escapeXml(attr.value) + '"';
                    }

                    const children = Array.from(node.childNodes);
                    if (children.length === 0) {
                        return result + '/>';
                    }

                    const isMixed = hasMixedContent(node);

                    if (isMixed) {
                        result += '>';
                        children.forEach((child, i) => {
                            if (child.nodeType === Node.TEXT_NODE) {
                                let text = child.textContent || '';
                                if (settings?.editor?.normalizeWhitespace) {
                                    text = text.replace(/\s+/g, ' ');
                                    if (i === 0) text = text.trimStart();
                                    if (i === children.length - 1) text = text.trimEnd();
                                }
                                result += escapeXml(text);
                            } else {
                                result += serialize(child, '');
                            }
                        });
                        return result + '</' + el.tagName + '>';
                    } else {
                        result += '>\n';
                        for (const child of children) {
                            const serialized = serialize(child, indent + '  ');
                            if (serialized) result += serialized + '\n';
                        }
                        return result + indent + '</' + el.tagName + '>';
                    }
                }
                case Node.TEXT_NODE: {
                    const text = node.textContent?.trim();
                    return text ? indent + escapeXml(text) : '';
                }
                case Node.CDATA_SECTION_NODE:
                    return indent + '<![CDATA[' + node.textContent + ']]>';
                case Node.COMMENT_NODE:
                    return indent + '<!--' + node.textContent + '-->';
                case Node.PROCESSING_INSTRUCTION_NODE: {
                    const pi = node as ProcessingInstruction;
                    return indent + '<?' + pi.target + ' ' + pi.data + '?>';
                }
                case Node.DOCUMENT_TYPE_NODE: {
                    const dt = node as DocumentType;
                    let doctype = '<!DOCTYPE ' + dt.name;
                    if (dt.publicId) doctype += ' PUBLIC "' + dt.publicId + '"';
                    if (dt.systemId) doctype += (dt.publicId ? ' ' : ' SYSTEM ') + '"' + dt.systemId + '"';
                    return doctype + '>';
                }
                case Node.DOCUMENT_NODE:
                    return Array.from(node.childNodes).map(c => serialize(c, indent)).filter(Boolean).join('\n');
                default:
                    return '';
            }
        };

        let serialized = serialize(doc);
        if (xmlDeclaration && !serialized.trim().startsWith('<?xml')) {
            serialized = xmlDeclaration[0] + '\n' + serialized;
        }
        return serialized;
    } catch (e) {
        console.error("Format error", e);
        return xml;
    }
};

export const sortXML = (xml: string, settings?: Settings): string => {
    try {
        if (!xml.trim()) return '';

        const xmlDeclaration = xml.match(/^<\?xml\s+[^?]+\?>/i);
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        if (doc.querySelector('parsererror')) {
            throw new Error("Invalid XML");
        }

        const hasMixedContent = (node: Node) => {
            return Array.from(node.childNodes).some(c =>
                c.nodeType === Node.TEXT_NODE && (c.textContent?.trim().length || 0) > 0
            );
        };

        const sortElement = (element: Element) => {
            if (element.attributes && element.attributes.length > 0) {
                const attrs = Array.from(element.attributes);
                attrs.sort((a, b) => a.name.localeCompare(b.name));
                attrs.forEach(attr => element.removeAttribute(attr.name));
                attrs.forEach(attr => element.setAttribute(attr.name, attr.value));
            }

            const isMixed = hasMixedContent(element);

            if (!isMixed) {
                const children = Array.from(element.children);
                children.sort((a, b) => a.tagName.localeCompare(b.tagName));
                children.forEach(child => element.appendChild(child));
            }

            Array.from(element.children).forEach(sortElement);
        };

        sortElement(doc.documentElement);
        let serialized = new XMLSerializer().serializeToString(doc);

        if (xmlDeclaration && !serialized.trim().startsWith('<?xml')) {
            serialized = xmlDeclaration[0] + '\n' + serialized;
        }

        return formatXML(serialized, settings);
    } catch (e) {
        console.error("Sort error", e);
        throw new Error("Failed to sort XML. Ensure it is valid first.");
    }
};

export const isMinified = (xml: string): boolean => {
    const trimmed = xml.trim();
    return trimmed.length > 50 && !trimmed.includes('\n');
};

export const validateAgainstSchema = (xml: string, xsd: string): ValidationResult => {
    if (!xml || !xsd) return { valid: true, errors: [] };

    const errors: { line: number; message: string }[] = [];
    const parser = new DOMParser();

    const xsdDoc = parser.parseFromString(xsd, 'application/xml');
    if (xsdDoc.querySelector('parsererror')) {
        return { valid: false, errors: [{ line: 1, message: 'Invalid XSD schema format' }] };
    }

    const xmlDoc = parser.parseFromString(xml, 'application/xml');
    if (xmlDoc.querySelector('parsererror')) {
        return { valid: false, errors: [{ line: 1, message: 'XML is not well-formed' }] };
    }

    // Element definitions extraction logic...
    const elementDefs = new Map();
    const complexTypes = new Map();

    xsdDoc.querySelectorAll('[localName="complexType"], complexType').forEach(ct => {
        const name = ct.getAttribute('name');
        if (name) {
            const elements: any[] = [];
            const attrs: any[] = [];
            ct.querySelectorAll('[localName="element"], element').forEach(e => {
                elements.push({
                    name: e.getAttribute('name') || e.getAttribute('ref'),
                    minOccurs: parseInt(e.getAttribute('minOccurs') || '1'),
                    maxOccurs: e.getAttribute('maxOccurs') === 'unbounded' ? Infinity : parseInt(e.getAttribute('maxOccurs') || '1')
                });
            });
            ct.querySelectorAll('[localName="attribute"], attribute').forEach(a => {
                attrs.push({
                    name: a.getAttribute('name'),
                    required: a.getAttribute('use') === 'required'
                });
            });
            complexTypes.set(name, { elements, attrs });
        }
    });

    xsdDoc.querySelectorAll(':scope > [localName="element"], :scope > element, schema > element').forEach(el => {
        const name = el.getAttribute('name');
        const type = el.getAttribute('type');
        if (name) {
            elementDefs.set(name, { type, element: el });
        }
    });

    const rootName = xmlDoc.documentElement.localName;
    if (elementDefs.size > 0 && !elementDefs.has(rootName)) {
        const validRoots = Array.from(elementDefs.keys()).join(', ');
        errors.push({ line: 1, message: `Root element <${rootName}> is not defined in schema. Expected: ${validRoots}` });
    }

    const getLineNumber = (xmlStr: string, search: string) => {
        const idx = xmlStr.indexOf(search);
        if (idx === -1) return 1;
        return xmlStr.substring(0, idx).split('\n').length;
    };

    const checkElement = (xmlEl: Element, depth = 0) => {
        if (depth > 100) return;
        const elName = xmlEl.localName;
        const def = elementDefs.get(elName);

        if (def && def.type && complexTypes.has(def.type)) {
            const typeDef = complexTypes.get(def.type);

            typeDef.attrs.forEach((attr: any) => {
                if (attr.required && !xmlEl.hasAttribute(attr.name)) {
                    const lineNum = getLineNumber(xml, xmlEl.outerHTML.substring(0, 50));
                    errors.push({ line: lineNum, message: `Missing required attribute "${attr.name}" on <${elName}>` });
                }
            });

            typeDef.elements.forEach((childDef: any) => {
                if (childDef.minOccurs > 0) {
                    const count = xmlEl.querySelectorAll(':scope > ' + childDef.name).length;
                    if (count < childDef.minOccurs) {
                        const lineNum = getLineNumber(xml, xmlEl.outerHTML.substring(0, 50));
                        errors.push({ line: lineNum, message: `Element <${elName}> requires at least ${childDef.minOccurs} <${childDef.name}> child element(s)` });
                    }
                }
            });
        }

        Array.from(xmlEl.children).forEach(child => checkElement(child, depth + 1));
    };

    checkElement(xmlDoc.documentElement);

    return { valid: errors.length === 0, errors };
};

const defaultColors = { tagBracket: '#818cf8', tagName: '#f472b6', attrName: '#67e8f9', attrValue: '#a3e635', comment: '#6b7280', text: '#e2e8f0' };

export const highlightXML = (xml: string, colors = defaultColors): string => {
    if (!xml) return '';
    const col = colors || defaultColors;
    let r = '', i = 0, n = xml.length;
    const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const c = (k: string, t: string) => '<span style="color:' + k + '">' + e(t) + '</span>';
    while (i < n) {
        if (xml.slice(i, i + 4) === '<!--') { let x = xml.indexOf('-->', i); x = x < 0 ? n : x + 3; r += '<span style="color:' + col.comment + ';font-style:italic">' + e(xml.slice(i, x)) + '</span>'; i = x; }
        else if (xml[i] === '<') {
            let j = i + 1, cl = xml[j] === '/'; if (cl) j++; let t = '';
            while (j < n && /[\w:-]/.test(xml[j])) { t += xml[j++]; }
            r += c(col.tagBracket, cl ? '</' : '<'); if (t) r += c(col.tagName, t);
            while (j < n && xml[j] !== '>' && !(xml[j] === '/' && xml[j + 1] === '>')) {
                if (/\s/.test(xml[j])) { r += xml[j++]; }
                else if (/[\w:-]/.test(xml[j])) {
                    let a = ''; while (j < n && /[\w:-]/.test(xml[j])) { a += xml[j++]; } r += c(col.attrName, a);
                    while (j < n && /\s/.test(xml[j])) { r += xml[j++]; }
                    if (xml[j] === '=') {
                        r += c('#94a3b8', '='); j++; while (j < n && /\s/.test(xml[j])) { r += xml[j++]; }
                        if (xml[j] === '"' || xml[j] === "'") { let q = xml[j], v = q; j++; while (j < n && xml[j] !== q) { v += xml[j++]; } if (j < n) { v += xml[j++]; } r += c(col.attrValue, v); }
                    }
                } else { r += e(xml[j++]); }
            }
            if (xml[j] === '/' && xml[j + 1] === '>') { r += c(col.tagBracket, '/>'); j += 2; } else if (xml[j] === '>') { r += c(col.tagBracket, '>'); j++; }
            i = j;
        } else { let t = ''; while (i < n && xml[i] !== '<') { t += xml[i++]; } r += '<span style="color:' + col.text + '">' + e(t) + '</span>'; }
    }
    return r;
};
