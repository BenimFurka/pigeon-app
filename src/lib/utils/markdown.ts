import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import hljs from 'highlight.js';
import type { Root, PhrasingContent } from 'mdast';
import type { Element, Root as HastRoot, Text as HastText } from 'hast';
import type { Plugin } from 'unified';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function splitInlinePattern(
    tree: Root,
    pattern: RegExp,
    toHtml: (content: string) => string
): void {
    visit(tree, 'text', (node, index, parent) => {
        if (index == null || !parent) return;

        pattern.lastIndex = 0;
        if (!pattern.test(node.value)) return;

        pattern.lastIndex = 0;
        const newNodes: PhrasingContent[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(node.value)) !== null) {
            if (match.index > lastIndex) {
                newNodes.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
            }
            newNodes.push({ type: 'html', value: toHtml(match[1]) });
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < node.value.length) {
            newNodes.push({ type: 'text', value: node.value.slice(lastIndex) });
        }

        parent.children.splice(index, 1, ...newNodes);
    });
}

const remarkSpoiler: Plugin<[], Root> = () => (tree) => {
    splitInlinePattern(tree, /\|\|([^|\n]+?)\|\|/g, (content) =>
        `<span class="spoiler">${escapeHtml(content)}</span>`
    );
};

const remarkUnderline: Plugin<[], Root> = () => (tree) => {
    splitInlinePattern(tree, /\+\+([^+\n]+?)\+\+/g, (content) =>
        `<u>${escapeHtml(content)}</u>`
    );
};

function getElementText(node: Element): string {
    return node.children
        .map((child) => {
            if (child.type === 'text') return (child as HastText).value;
            if (child.type === 'element') return getElementText(child as Element);
            return '';
        })
        .join('');
}

const rehypeCustomCodeBlocks: Plugin<[], HastRoot> = () => (tree) => {
    visit(tree, 'element', (node, index, parent) => {
        if (index == null || !parent || node.tagName !== 'pre') return;

        const codeEl = node.children[0];
        if (!codeEl || codeEl.type !== 'element' || codeEl.tagName !== 'code') return;

        const className = codeEl.properties?.className;
        let lang = '';

        if (Array.isArray(className)) {
            const langClass = className.find((item) => String(item).startsWith('language-'));
            if (langClass) lang = String(langClass).replace('language-', '');
        } else if (typeof className === 'string' && className.startsWith('language-')) {
            lang = className.replace('language-', '');
        }

        const content = getElementText(codeEl as Element).replace(/\n$/, '');
        const lines = content.split('\n');
        let highlighted: string;
        let langDisplay = 'TEXT';

        if (lang && hljs.getLanguage(lang)) {
            try {
                highlighted = hljs.highlight(content, { language: lang, ignoreIllegals: true }).value;
                langDisplay = lang.toUpperCase();
            } catch {
                highlighted = hljs.highlightAuto(content).value;
            }
        } else {
            highlighted = hljs.highlightAuto(content).value;
        }

        const highlightedLines = highlighted.split('\n');
        let codeHtml = '';

        for (let i = 0; i < lines.length; i++) {
            const lineNumber = i + 1;
            const highlightedLine = highlightedLines[i] || '';
            codeHtml += `<div class="code-line"><span class="line-number">${lineNumber}</span><span class="line-content">${highlightedLine}</span></div>`;
        }

        parent.children[index] = {
            type: 'raw',
            value: `<div class="code-block"><div class="code-header">${langDisplay}</div><div class="code-content">${codeHtml}</div></div>`,
        };
    });
};

const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkSpoiler)
    .use(remarkUnderline)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex)
    .use(rehypeCustomCodeBlocks)
    .use(rehypeStringify, { allowDangerousHtml: true });

export function renderMarkdown(text: string): string {
    if (!text) return '';
    
    const normalized = normalizeMarkdown(text);
    return processor.processSync(normalized).toString().trim();
}

/** @deprecated */
export const md = {
    render: renderMarkdown,
};

export function normalizeMarkdown(text: string): string {
    if (!text) return text;

    const lines = text.split('\n');
    const newLines: string[] = [];
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmed = line.trim();

        if (!inCodeBlock) {
            if (trimmed.startsWith('```')) {
                inCodeBlock = true;
                newLines.push(line);
            } else {
                newLines.push(line);
            }
        } else {
            if (trimmed === '```') {
                inCodeBlock = false;
                newLines.push(line);
                if (i + 1 < lines.length && lines[i + 1].trim().startsWith('```')) {
                    newLines.push('');
                }
            } else if (line.includes('```')) {
                const idx = line.indexOf('```');
                const before = line.substring(0, idx);
                const after = line.substring(idx + 3);

                if (before.length > 0) {
                    newLines.push(before);
                }

                newLines.push('```');
                inCodeBlock = false;

                const afterTrimmed = after.trimStart();
                if (afterTrimmed.startsWith('```')) {
                    newLines.push('');
                    newLines.push(afterTrimmed);
                    inCodeBlock = true;
                } else if (afterTrimmed.length > 0) {
                    newLines.push(afterTrimmed);
                }

                if (i + 1 < lines.length && lines[i + 1].trim().startsWith('```')) {
                    const last = newLines[newLines.length - 1];
                    if (last !== '' && !last.trim().startsWith('```')) {
                        newLines.push('');
                    }
                }
            } else {
                newLines.push(line);
            }
        }
    }

    const result: string[] = [];
    for (let i = 0; i < newLines.length; i++) {
        result.push(newLines[i]);
        if (i < newLines.length - 1) {
            const current = newLines[i].trim();
            const next = newLines[i + 1].trim();
            if (current === '```' && next.startsWith('```') && newLines[i + 1] !== '') {
                result.push('');
            }
        }
    }

    return result.join('\n');
}