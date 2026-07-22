<!-- TODO: Use more -->
<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { EditorView, keymap, highlightActiveLine, placeholder as cmPlaceholder, lineNumbers } from '@codemirror/view';
    import { EditorState } from '@codemirror/state';
    import { history, historyKeymap, defaultKeymap } from '@codemirror/commands';
    import { markdown } from '@codemirror/lang-markdown';
    import { GFM } from '@lezer/markdown';
    import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
    import { tags } from '@lezer/highlight';
    import { _ } from 'svelte-i18n';

    import { spoilerExtension, underlineExtension, inlineMathExtension } from '$lib/editor/markdown-extensions';
    import { markdownLivePreview, markdownBlockPreview } from '$lib/editor/markdown-live-preview';
    import { insertTable, reformatTable, addTableRow, removeTableRow, addTableColumn, removeTableColumn } from '$lib/editor/markdown-table';
    import { type HotkeyAction, hotkeys, matchesHotkey } from '$lib/stores/hotkeys';

    export let variant: 'compact' | 'full' = 'compact';
    export let initialValue: string = '';
    export let placeholder: string = $_('codemirror_editor.placeholder');
    export let hotkeyAction: HotkeyAction = 'send_message';

    const dispatch = createEventDispatcher<{ change: { markdown: string }; submit: void }>();

    let editorContainer: HTMLDivElement;
    let view: EditorView | null = null;
    let currentMarkdown = initialValue;
    
    let savedSelection = { anchor: 0, head: 0 };
    $: sendKeyBinding = $hotkeys[hotkeyAction];

    export function getEditorMarkdown(): string {
        if (!view) return currentMarkdown;
        return view.state.doc.toString();
    }

    export function setEditorMarkdown(md: string) {
        if (!view) { initialValue = md; currentMarkdown = md; return; }
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: md } });
        currentMarkdown = md;
    }

    export function focusEditor() {
        if (view) {
            view.focus();
            view.dispatch({ selection: { anchor: savedSelection.anchor, head: savedSelection.head } });
        }
    }

    export function clearEditor() { setEditorMarkdown(''); }

    function ensureSelection(): boolean {
        if (!view) return false;
        if (!view.hasFocus) {
            view.focus();
            view.dispatch({ selection: { anchor: savedSelection.anchor, head: savedSelection.head } });
        }
        return true;
    }

    export function insertMarkdownSyntax(before: string, after: string = before) {
        if (!ensureSelection()) return;
        const { from, to } = view!.state.selection.main;
        const selectedText = view!.state.sliceDoc(from, to);
        view!.dispatch({
            changes: { from, to, insert: before + selectedText + after },
            selection: { anchor: from + before.length, head: from + before.length + selectedText.length }
        });
        view!.focus();
    }

    export function insertBlockPrefix(prefix: string) {
        if (!ensureSelection()) return;
        const { from } = view!.state.selection.main;
        const line = view!.state.doc.lineAt(from);
        if (line.text.startsWith(prefix)) {
            view!.dispatch({ changes: { from: line.from, to: line.from + prefix.length, insert: '' } });
        } else {
            view!.dispatch({ changes: { from: line.from, insert: prefix } });
        }
        view!.focus();
    }

    export function insertTableAtCursor(rows: number = 3, cols: number = 3) {
        if (!ensureSelection()) return;
        insertTable(view!, rows, cols);
    }
    export function reformatTableAtCursor() { if (view) reformatTable(view, view.state.selection.main.from); }
    export function addTableRowAtCursor() { if (view) addTableRow(view); }
    export function removeTableRowAtCursor() { if (view) removeTableRow(view); }
    export function addTableColumnAtCursor() { if (view) addTableColumn(view); }
    export function removeTableColumnAtCursor() { if (view) removeTableColumn(view); }
    export function insertSpoiler() { insertMarkdownSyntax('||', '||'); }
    export function insertUnderline() { insertMarkdownSyntax('++', '++'); }

    function handleWrapperKeydown(event: KeyboardEvent) {
        if (event.isComposing) return;

        if (matchesHotkey(event, sendKeyBinding)) {
            event.preventDefault();
            dispatch('submit');
        }
    }

    const tableAutoFormat = EditorView.updateListener.of((update) => {
        if (!update.selectionSet && !update.docChanged) return;
        const prevPos = update.startState.selection.main.from;
        const currPos = update.state.selection.main.from;
        const wasInTable = update.startState.doc.lineAt(prevPos).text.trim().startsWith('|');
        const isInTable = update.state.doc.lineAt(currPos).text.trim().startsWith('|');
        
        if (wasInTable && !isInTable) {
            setTimeout(() => { if (view) reformatTable(view, prevPos); }, 0);
        }
    });

    const selectionSaver = EditorView.domEventHandlers({
        blur: () => {
            if (view) {
                const { from, to } = view.state.selection.main;
                savedSelection = { anchor: from, head: to };
            }
            return false;
        }
    });

    const markdownHighlighting = HighlightStyle.define([
        { tag: tags.heading1, color: 'var(--color-text)', fontWeight: 'bold', fontSize: '1.5em' },
        { tag: tags.heading2, color: 'var(--color-text)', fontWeight: 'bold', fontSize: '1.3em' },
        { tag: tags.heading3, color: 'var(--color-text)', fontWeight: 'bold', fontSize: '1.15em' },
        { tag: tags.strong, color: 'var(--color-text)', fontWeight: 'bold' },
        { tag: tags.emphasis, color: 'var(--color-text)', fontStyle: 'italic' },
        { tag: tags.strikethrough, textDecoration: 'line-through', opacity: '1.0' },
        { tag: tags.link, color: 'var(--color-accent)', textDecoration: 'underline' },
        { tag: tags.monospace, color: 'var(--color-accent)', backgroundColor: 'var(--color-bg)', padding: '1px 4px', borderRadius: '3px' },
        { tag: tags.quote, color: 'var(--color-text)', opacity: '0.8', fontStyle: 'italic' },
        { tag: tags.meta, color: 'var(--color-text-muted, rgba(255, 255, 255, 0.5))' }
    ]);

    const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            currentMarkdown = update.state.doc.toString();
            dispatch('change', { markdown: currentMarkdown });
        }
    });

    const editorTheme = EditorView.theme({
        '&': { backgroundColor: 'transparent', color: 'var(--color-text)', height: '100%', fontSize: '14px' },
        '.cm-scroller': { fontFamily: 'inherit', overflow: 'auto' },
        '.cm-content': { padding: variant === 'compact' ? '10px 12px' : '16px 20px', fontFamily: 'inherit', lineHeight: '1.5', caretColor: 'var(--color-accent)', minHeight: '20px' },
        '.cm-line': { padding: '0' },
        '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: 'var(--color-text-muted, rgba(255, 255, 255, 0.3))', minWidth: variant === 'full' ? '40px' : '0', display: variant === 'full' ? 'block' : 'none' },
        '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'transparent' },
        '&.cm-focused': { outline: 'none' },
        '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--color-accent)', borderLeftWidth: '2px' },
        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--color-accent-soft) !important' },
        '.cm-placeholder': { color: 'var(--color-text-muted, rgba(255, 255, 255, 0.4))', fontStyle: 'italic' },
        '.cm-md-bold': { fontWeight: 'bold' },
        '.cm-md-italic': { fontStyle: 'italic' },
        '.cm-md-strike': { textDecoration: 'line-through', color: 'var(--color-text)', opacity: "1.0"},
        '.cm-md-code, .cm-md-inline-math': { fontFamily: "'JetBrains Mono', monospace", backgroundColor: 'var(--color-bg)', color: 'var(--color-accent)', padding: '1px 4px', borderRadius: '3px', fontSize: '0.92em' },
        '.cm-md-spoiler': { backgroundColor: 'rgba(0, 0, 0, 0.3);', color: 'rgba(0, 0, 0, 0.3);', borderRadius: '2px', padding: '0 2px', transition: 'all 0.2s ease', cursor: 'pointer' },
        '.cm-md-spoiler:hover': { backgroundColor: 'transparent', color: 'var(--color-text)'},
        '.cm-md-underline': { textDecoration: 'underline', textUnderlineOffset: '3px' },
        '.cm-md-h1': { fontSize: '1.6em', fontWeight: 'bold', lineHeight: '1.3' },
        '.cm-md-h2': { fontSize: '1.35em', fontWeight: 'bold', lineHeight: '1.3' },
        '.cm-md-h3': { fontSize: '1.15em', fontWeight: 'bold', lineHeight: '1.3' },
        '.cm-md-h4': { fontSize: '1.05em', fontWeight: 'bold' },
        '.cm-md-blockquote': { fontStyle: 'italic', opacity: '0.85', borderLeft: '3px solid var(--color-accent)', paddingLeft: '10px', marginLeft: '4px' },
        '.cm-md-list-marker': { color: 'var(--color-accent)', fontWeight: 'bold' },
        '.cm-md-code-block': { fontFamily: "'JetBrains Mono', monospace", backgroundColor: 'var(--color-bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.92em', display: 'block' },
        '.cm-md-table': { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9em', color: 'var(--color-accent)' },
        '.cm-md-link': { color: 'var(--color-accent)', textDecoration: 'underline', cursor: 'pointer', textDecorationStyle: 'solid', textDecorationThickness: '1px' },
        '.cm-cursor-anchor': { opacity: '0' },
        '.cm-link-widget': { color: 'var(--color-accent)', textDecoration: 'underline', cursor: 'pointer', textDecorationStyle: 'solid', textDecorationThickness: '1px'  },
        
        '.cm-hr-widget-container': {
            display: 'block',
            height: '1.5em',
            position: 'relative'
        },
        '.cm-hr-widget': {
            border: 'none',
            borderTop: '1px solid var(--color-border)',
            margin: '0',
            position: 'absolute',
            top: '50%',
            left: '0',
            right: '0'
        },
        '.cm-table-widget': {
            margin: '8px 0',
            padding: '0',
            display: 'block'
        },
        '.cm-table-widget table': {
            borderCollapse: 'collapse',
            width: '100%',
            margin: '0',
            fontFamily: 'inherit',
            fontSize: '14px'
        },
        '.cm-table-widget th, .cm-table-widget td': {
            border: '1px solid var(--color-border)',
            padding: '8px 12px',
            textAlign: 'left',
            color: 'var(--color-text)',
            backgroundColor: 'var(--color-bg-elevated)',
            outline: 'none',
            transition: 'background 0.15s ease',
            cursor: 'text'
        },
        '.cm-table-widget th': {
            backgroundColor: 'var(--color-bg)',
            fontWeight: '600'
        },
        '.cm-table-widget th:focus, .cm-table-widget td:focus': {
            backgroundColor: 'var(--color-bg)',
            boxShadow: 'inset 0 0 0 2px var(--color-accent)'
        },
        '.cm-table-widget tr:hover td': {
            backgroundColor: 'var(--color-bg)'
        },
        '.cm-hidden-mark': { 
            display: 'inline-block',
            width: '0',
            height: '0',
            fontSize: '0',
            lineHeight: '0',
            overflow: 'hidden',
            opacity: '0'
        }
    });

    function createEditor() {
        if (view) {
            view.destroy();
        }
        
        const extensions = [
            history(), highlightActiveLine(), keymap.of([...defaultKeymap, ...historyKeymap]),
            markdown({ extensions: [GFM, spoilerExtension, underlineExtension, inlineMathExtension] }),
            syntaxHighlighting(markdownHighlighting), cmPlaceholder(placeholder), updateListener,
            markdownLivePreview, 
            markdownBlockPreview,
            tableAutoFormat, selectionSaver, EditorView.lineWrapping, editorTheme
        ];
        if (variant === 'full') extensions.push(lineNumbers());

        view = new EditorView({ state: EditorState.create({ doc: initialValue, extensions }), parent: editorContainer });
    }

    onMount(() => {
        createEditor();
    });

    onDestroy(() => { view?.destroy(); });
</script>

<div 
    class="cm-wrapper" 
    class:compact={variant === 'compact'} 
    class:full={variant === 'full'} 
    bind:this={editorContainer} 
    on:keydown={handleWrapperKeydown}
>
</div>

<style>
    .cm-wrapper {
        width: 100%; background: var(--color-bg-elevated); border: 1px solid var(--color-border);
        border-radius: var(--radius-sm); transition: border-color 0.2s, box-shadow 0.2s; display: flex; flex-direction: column;
    }
    .cm-wrapper.compact { min-height: 40px; max-height: 200px; overflow-y: auto; }
    .cm-wrapper.full { flex: 1; min-height: 0; border-radius: 0; border: none; background: transparent; }
    .cm-wrapper:focus-within { border-color: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent-soft); }
    .cm-wrapper.full:focus-within { box-shadow: none; }
    .cm-wrapper::-webkit-scrollbar { width: 4px; }
    .cm-wrapper::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 2px; }
</style>