import { Settings } from './xml';

export const validateJSON = (json: string): { message: string; line: number } | null => {
    if (!json.trim()) return null;
    try {
        JSON.parse(json);
        return null;
    } catch (e: any) {
        // Try to extract line number from error message if possible
        // V8 error messages usually look like "Unexpected token } in JSON at position 123"
        // We can try to calculate line number from position
        const match = e.message.match(/at position (\d+)/);
        let line = 1;
        if (match) {
            const pos = parseInt(match[1]);
            line = json.substring(0, pos).split('\n').length;
        }
        return { message: e.message, line };
    }
};

export const formatJSON = (json: string): string => {
    try {
        if (!json.trim()) return '';
        const parsed = JSON.parse(json);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return json;
    }
};

export const sortJSON = (json: string): string => {
    try {
        if (!json.trim()) return '';
        const parsed = JSON.parse(json);

        const sortDeep = (obj: any): any => {
            if (Array.isArray(obj)) {
                // We typically don't sort arrays in JSON as order matters, 
                // but we deep sort the items inside if they are objects
                return obj.map(sortDeep);
            } else if (obj !== null && typeof obj === 'object') {
                const sortedKeys = Object.keys(obj).sort();
                const sortedObj: any = {};
                sortedKeys.forEach(key => {
                    sortedObj[key] = sortDeep(obj[key]);
                });
                return sortedObj;
            }
            return obj;
        };

        const sorted = sortDeep(parsed);
        return JSON.stringify(sorted, null, 2);
    } catch {
        return json;
    }
};

export const highlightJSON = (json: string, colors: Settings['colors']): string => {
    if (!json) return '';

    // Simple tokenizer for JSON syntax highlighting
    const escapeHtml = (str: string) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const c = (color: string, text: string) => `<span style="color:${color}">${escapeHtml(text)}</span>`;

    return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[\[\]{}:,])/g,
        (match) => {
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    // Key with potential whitespace before colon
                    // We need to split the string from the colon/whitespace
                    // match is like "key": or "key"  :
                    const parts = match.match(/^(".*?")(\s*)(:)$/);
                    if (parts) {
                        return c(colors.attrName, parts[1]) + escapeHtml(parts[2]) + c(colors.tagBracket, parts[3]);
                    }
                    // Fallback for simple case without space catch (though logic above covers all)
                    return c(colors.attrName, match.replace(/:$/, '')) + c(colors.tagBracket, ':');
                } else {
                    // String value
                    return c(colors.attrValue, match);
                }
            } else if (/true|false|null/.test(match)) {
                return c(colors.tagName, match);
            } else if (/^-?\d/.test(match)) {
                return c(colors.attrValue, match);
            } else if (/[\[\]{}:,]/.test(match)) {
                return c(colors.tagBracket, match);
            }
            return c(colors.text, match);
        }
    );
};
