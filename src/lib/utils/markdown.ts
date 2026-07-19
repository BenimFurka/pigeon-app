import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

export const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false,
    breaks: false,
    xhtmlOut: false,
});

md.disable(['lheading']);

md.renderer.rules.fence = function(tokens: any[], idx: number, options: any, env: any) {
    const token = tokens[idx];
    const info = token.info ? token.info.trim() : '';
    const lang = info.split(' ')[0];
    let content = token.content || '';

    content = content.replace(/\n+$/, '');
    const lines = content.split('\n');

    if (lang && hljs.getLanguage(lang)) {
        try {
            const highlighted = hljs.highlight(content, { language: lang, ignoreIllegals: true }).value;
            const highlightedLines = highlighted.split('\n');
            const langDisplay = lang.toUpperCase();

            let codeHtml = '';
            for (let i = 0; i < lines.length; i++) {
                const lineNumber = i + 1;
                const highlightedLine = highlightedLines[i] || '';
                codeHtml += `<div class="code-line"><span class="line-number">${lineNumber}</span><span class="line-content">${highlightedLine}</span></div>`;
            }

            return `<div class="code-block"><div class="code-header">${langDisplay}</div><div class="code-content">${codeHtml}</div></div>\n`;
        } catch (__) {}
    }

    const highlighted = hljs.highlightAuto(content).value;
    const highlightedLines = highlighted.split('\n');
    const langDisplay = 'TEXT';

    let codeHtml = '';
    for (let i = 0; i < lines.length; i++) {
        const lineNumber = i + 1;
        const highlightedLine = highlightedLines[i] || '';
        codeHtml += `<div class="code-line"><span class="line-number">${lineNumber}</span><span class="line-content">${highlightedLine}</span></div>`;
    }

    return `<div class="code-block"><div class="code-header">${langDisplay}</div><div class="code-content">${codeHtml}</div></div>\n`;
};

md.renderer.rules.text = function(tokens: any[], idx: number) {
    let content = tokens[idx].content;
    content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    content = content.replace(/\n/g, '<br>');
    content = content.replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler">$1</span>');
    return content;
};

md.renderer.rules.bullet_list_open = function() { return '<ul>'; };
md.renderer.rules.bullet_list_close = function() { return '</ul>'; };
md.renderer.rules.ordered_list_open = function() { return '<ol>'; };
md.renderer.rules.ordered_list_close = function() { return '</ol>'; };
md.renderer.rules.list_item_open = function() { return '<li>'; };
md.renderer.rules.list_item_close = function() { return '</li>'; };

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