<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Modal from '$lib/components/overlays/Modal.svelte';
    import type { News } from '$lib/types/models';
    import MediaList from '$lib/components/media/MediaList.svelte';
    import { markNewsAsRead } from '$lib/api';
    import { newsEnabled } from '$lib/stores/news';
    import MarkdownIt from 'markdown-it';
    import hljs from 'highlight.js';

    // Props
    export let isOpen = false;
    export let news: News;

    // Event dispatcher
    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    // Markdown parser
    const md = new MarkdownIt({
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

    // Utility functions
    function normalizeMarkdown(text: string): string {
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
                } else {
                    newLines.push(line);
                }
            }
        }

        return newLines.join('\n');
    }

    // Computed values
    $: renderedContent = news.content ? (() => {
        const normalized = normalizeMarkdown(news.content);
        const processed = md.render(normalized).trim().replace(/<\/div>\s*\n/g, '</div>');
        return processed;
    })() : '';

    function handleSpoilerClick(e: MouseEvent | KeyboardEvent) {
        const target = e.target as HTMLElement;
        if (target.classList.contains('spoiler')) {
            e.preventDefault();
            e.stopPropagation();
            target.classList.toggle('revealed');
        }
    }

    // Event handlers
    async function handleClose() {
        try {
            await markNewsAsRead(news.id);
            newsEnabled.markAsRead(news.id);
        } catch (e) {
            console.error('Failed to mark news as read:', e);
        }
        dispatch('close');
    }
</script>

<Modal
    open={isOpen}
    title={news.title}
    showBack={false}
    maxWidth="600px"
    zIndex={1500}
    on:close={handleClose}
>
    <div class="content">
        {#if news.media && news.media.length > 0}
            <div class="media-section">
                <MediaList media={news.media} currentUserId={null} message={null} />
            </div>
        {/if}
        <div class="news-text" role="button" tabindex="0" on:click|stopPropagation={handleSpoilerClick} on:keydown={(e) => e.key === 'Enter' && handleSpoilerClick(e)}>
            {@html renderedContent}
        </div>
    </div>

    <div slot="footer">
        <div class="footer-field">
            <button
                type="button"
                class="btn outline full"
                on:click={handleClose}
            >
                Close
            </button>
        </div>
    </div>
</Modal>

<style>
    .footer-field {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .media-section {
        width: 100%;
    }

    .news-text {
        color: var(--color-text);
        line-height: 1.6;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: pre-line;
    }

    .news-text :global(h1),
    .news-text :global(h2),
    .news-text :global(h3),
    .news-text :global(h4),
    .news-text :global(h5),
    .news-text :global(h6) {
        margin: 0.5em 0 0.25em 0;
        font-weight: 600;
        line-height: 1.3;
        color: var(--color-text);
    }

    .news-text :global(h1) {
        font-size: 1.5em;
    }

    .news-text :global(h2) {
        font-size: 1.3em;
    }

    .news-text :global(h3) {
        font-size: 1.1em;
    }

    .news-text :global(p) {
        margin: 0.5em 0;
    }

    .news-text :global(a) {
        color: var(--color-accent);
        text-decoration: underline;
    }

    .news-text :global(code) {
        background: rgba(0, 0, 0, 0.2);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.9em;
    }

    .news-text :global(pre) {
        background: rgba(0, 0, 0, 0.2);
        padding: 16px;
        border-radius: 8px;
        overflow-x: auto;
        margin: 1em 0;
    }

    .news-text :global(pre code) {
        background: none;
        padding: 0;
    }

    .news-text :global(ul),
    .news-text :global(ol) {
        margin: 0.25em 0;
        padding-left: 2em;
    }

    .news-text :global(li) {
        margin: 0.25em 0;
    }

    .news-text :global(blockquote) {
        border-left: 4px solid var(--color-accent);
        padding-left: 16px;
        margin: 1em 0;
        color: var(--color-text-muted);
    }

    .news-text :global(table) {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
    }

    .news-text :global(th),
    .news-text :global(td) {
        border: 1px solid var(--color-border);
        padding: 8px;
        text-align: left;
    }

    .news-text :global(th) {
        background: rgba(0, 0, 0, 0.1);
        font-weight: 600;
    }

    .news-text :global(.code-block) {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        margin: 1em 0;
        overflow: hidden;
    }

    .news-text :global(.code-header) {
        background: rgba(0, 0, 0, 0.2);
        padding: 8px 12px;
        font-size: 0.85em;
        font-weight: 600;
        color: var(--color-text-muted);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .news-text :global(.code-content) {
        padding: 0;
        overflow-x: auto;
    }

    .news-text :global(.code-line) {
        display: flex;
        line-height: 1.5;
    }

    .news-text :global(.line-number) {
        min-width: 40px;
        padding: 0 12px;
        text-align: right;
        color: var(--color-text-muted);
        background: rgba(0, 0, 0, 0.1);
        user-select: none;
        font-size: 0.9em;
    }

    .news-text :global(.line-content) {
        padding: 0 12px;
        flex: 1;
    }

    
    .news-text :global(.spoiler) {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 3px;
        padding: 2px 4px;
        cursor: pointer;
        transition: background 0.2s;
        user-select: none;
        color: transparent;
        text-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
    }
    
    .news-text :global(.spoiler:hover) {
        background: rgba(0, 0, 0, 0.4);
    }
    
    .news-text :global(.spoiler.revealed) {
        background: transparent;
        user-select: auto;
        color: inherit;
        text-shadow: none;
    }
</style>
