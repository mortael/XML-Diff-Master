import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Circle } from 'lucide-react';

interface TreeViewProps {
    xml: string;
}

interface TreeNode {
    type: 'element' | 'text' | 'comment' | 'cdata';
    name: string;
    attributes?: { name: string; value: string }[];
    children?: TreeNode[];
    text?: string;
    id: string; // unique id for key
}

const parseXMLToTree = (xml: string): TreeNode | null => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        if (doc.querySelector('parsererror')) return null;

        let seed = 0;
        const uid = () => `node-${seed++}`;

        const processNode = (node: Node): TreeNode | null => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as Element;
                const attributes = Array.from(el.attributes).map(a => ({
                    name: a.name,
                    value: a.value
                }));

                // Check if purely text content
                const hasTextOnly = el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE;

                if (hasTextOnly) {
                    return {
                        type: 'element',
                        name: el.tagName,
                        attributes,
                        text: el.textContent || '',
                        id: uid()
                    };
                }

                const children = Array.from(el.childNodes)
                    .map(processNode)
                    .filter((n): n is TreeNode => n !== null);

                return {
                    type: 'element',
                    name: el.tagName,
                    attributes,
                    children,
                    id: uid()
                };
            } else if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent?.trim();
                if (!text) return null;
                return { type: 'text', name: '#text', text, id: uid() };
            } else if (node.nodeType === Node.COMMENT_NODE) {
                return { type: 'comment', name: '#comment', text: node.textContent || '', id: uid() };
            } else if (node.nodeType === Node.CDATA_SECTION_NODE) {
                return { type: 'cdata', name: '#cdata', text: node.textContent || '', id: uid() };
            }
            return null;
        };

        return processNode(doc.documentElement);
    } catch {
        return null;
    }
};

const TreeItem = ({ node, depth = 0 }: { node: TreeNode; depth?: number }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (node.type === 'text') {
        return (
            <div className="flex items-start text-xs font-mono py-0.5 hover:bg-slate-800/50 rounded" style={{ paddingLeft: `${depth * 1.5}rem` }}>
                <span className="text-slate-400 select-all break-all text-left">"{node.text}"</span>
            </div>
        );
    }

    if (node.type === 'comment') {
        return (
            <div className="flex items-start text-xs font-mono py-0.5 hover:bg-slate-800/50 rounded" style={{ paddingLeft: `${depth * 1.5}rem` }}>
                <span className="text-slate-500 italic select-all text-left">&lt;!-- {node.text} --&gt;</span>
            </div>
        );
    }

    // Element
    const hasChildren = node.children && node.children.length > 0;
    const hasText = node.text !== undefined; // Leaf element with text body

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    return (
        <div className="text-xs font-mono text-left">
            <div
                className="flex items-center gap-1 py-0.5 hover:bg-slate-800 rounded cursor-pointer group"
                style={{ paddingLeft: `${depth * 1.5}rem` }}
                onClick={toggle}
            >
                {/* Toggler */}
                <div className="w-4 h-4 flex items-center justify-center shrink-0 text-slate-500 hover:text-slate-300">
                    {(hasChildren || hasText) ? (
                        isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                    ) : <Circle size={4} className="opacity-30" />}
                </div>

                {/* Tag Name */}
                <span className="text-pink-400 font-semibold">{node.name}</span>

                {/* Attributes */}
                {node.attributes && node.attributes.map(attr => (
                    <span key={attr.name} className="ml-1 hidden sm:inline">
                        <span className="text-cyan-300">{attr.name}</span>
                        <span className="text-slate-500">=</span>
                        <span className="text-lime-400">"{attr.value}"</span>
                    </span>
                ))}

                {/* Folded Preview */}
                {!isOpen && (hasChildren || hasText) && (
                    <span className="text-slate-600 ml-1 text-[10px] select-none">...</span>
                )}

                {/* Inline Text Content (if leaf) */}
                {hasText && isOpen && (
                    <span className="ml-1 text-slate-300 break-all">
                        {node.text}
                    </span>
                )}
            </div>

            {isOpen && hasChildren && (
                <div>
                    {node.children!.map(child => (
                        <TreeItem key={child.id} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export const TreeView = ({ xml }: TreeViewProps) => {
    const tree = useMemo(() => parseXMLToTree(xml), [xml]);

    if (!xml) return <div className="text-slate-500 italic p-4 text-center">No content</div>;
    if (!tree) return <div className="text-red-400 italic p-4 text-center">Invalid XML structure</div>;

    return (
        <div className="p-2 overflow-auto h-full pb-20">
            <TreeItem node={tree} />
        </div>
    );
};
