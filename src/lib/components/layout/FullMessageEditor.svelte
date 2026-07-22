<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { X, Send, Paperclip, Smile, ImagePlay, Bold, Italic, Strikethrough, Code, Link2, Heading, List, ListOrdered, Quote, Check, Eye, /* , Table, Rows, Minus, Plus, Columns */ 
    Underline, Minus, Sigma} from 'lucide-svelte';
    import { hotkeys } from '$lib/stores/hotkeys';
    
    import CodeMirrorEditor from '$lib/components/editor/CodeMirrorEditor.svelte';
    import ChatHeader from '$lib/components/layout/ChatHeader.svelte';
    import MessageList from '$lib/components/layout/MessageList.svelte';
    import MessageInput from '$lib/components/layout/MessageInput.svelte';
    import Bar from '$lib/components/layout/Bar.svelte';
    
    import AttachmentModal from '$lib/components/forms/modals/AttachmentModal.svelte';
    import EmojiPicker from '$lib/components/media/EmojiPicker.svelte';
    import GifPicker from '$lib/components/media/GifPicker.svelte';
    
    import { _ } from 'svelte-i18n';
    import type { MessageMedia, GifItem, GifMedia } from '$lib/types/models';

    export let isOpen = false;
    export let chatId: number | null = null;
    export let chatContext: any;
    export let initialDraft = '';

    const dispatch = createEventDispatcher<{
        close: { draft: string };
        send: { content: string; attachmentIds?: number[]; media?: MessageMedia[] };
    }>();

    let editorComponent: CodeMirrorEditor;
    let rightMessageInputComponent: any;
    let currentDraft = initialDraft;
    
    // Modal states
    let attachmentModalOpen = false;
    let emojiPickerOpen = false;
    let gifDropdownOpen = false;
    let emojiButtonRef: HTMLButtonElement;
    let gifButtonRef: HTMLButtonElement;
    let pastedText = '';
    let pastedFiles: File[] = [];

    // Computed values
    $: sendKeyBinding = $hotkeys.send_message_full_editor;
    $: sendKeyHint = formatSendKeyHint(sendKeyBinding);
    $: placeholderText = $_('full_editor.placeholder').replace('Ctrl+Enter', sendKeyHint);

    function formatSendKeyHint(binding: any): string {
        if (!binding) return 'Ctrl+Enter';
        const parts: string[] = [];
        if (binding.ctrl) parts.push('Ctrl');
        if (binding.alt) parts.push('Alt');
        if (binding.shift) parts.push('Shift');
        if (binding.meta) parts.push('Meta');
        parts.push(binding.key === ' ' ? 'Space' : binding.key);
        return parts.join('+');
    }

    // Toolbar
    function toggleBold() { editorComponent?.insertMarkdownSyntax('**'); }
    function toggleItalic() { editorComponent?.insertMarkdownSyntax('*'); }
    function toggleStrike() { editorComponent?.insertMarkdownSyntax('~~'); }
    function toggleCode() { editorComponent?.insertMarkdownSyntax('`'); }
    function insertLink() { editorComponent?.insertMarkdownSyntax('[', '](url)'); }
    function insertHeading() { editorComponent?.insertBlockPrefix('### '); }
    function insertBulletList() { editorComponent?.insertBlockPrefix('- '); }
    function insertOrderedList() { editorComponent?.insertBlockPrefix('1. '); }
    function insertQuote() { editorComponent?.insertBlockPrefix('> '); }
    function toggleSpoiler() { editorComponent?.insertSpoiler(); }
    function toggleUnderline() { editorComponent?.insertUnderline(); }
    function insertHorizontalRule() { editorComponent?.insertBlockPrefix('\n-----\n'); }
    function insertInlineMath() { editorComponent?.insertMarkdownSyntax('$'); }
    
    // Tables
    // function insertTableHere() { editorComponent?.insertTableAtCursor(); }
    // function addRow() { editorComponent?.addTableRowAtCursor(); }
    // function removeRow() { editorComponent?.removeTableRowAtCursor(); }
    // function addColumn() { editorComponent?.addTableColumnAtCursor(); }
    // function removeColumn() { editorComponent?.removeTableColumnAtCursor(); }

    // Keys
    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape' && isOpen) {
            const isModalOpen = document.querySelector('.modal-backdrop, .attachment-modal, .media-viewer-backdrop');
            if (!isModalOpen) {
                event.preventDefault();
                handleClose();
            }
        }
    }

    onMount(() => {
        window.addEventListener('keydown', handleKeyDown);
    });

    onDestroy(() => {
        window.removeEventListener('keydown', handleKeyDown);
    });

    // Actions
    function handleClose() {
        const finalDraft = editorComponent?.getEditorMarkdown() ?? currentDraft;
        dispatch('close', { draft: finalDraft });
    }

    function handleSend() {
        const content = editorComponent?.getEditorMarkdown() ?? '';
        if (!content.trim()) return;
        
        dispatch('send', { content: content.trim() });
        editorComponent?.clearEditor();
        currentDraft = '';
    }

    function handleEditorChange(event: CustomEvent<{ markdown: string }>) {
        currentDraft = event.detail.markdown;
    }

    function handleEditorSubmit() {
        handleSend();
    }

    function handleAttachmentSent(event: CustomEvent<{ content: string; media: MessageMedia[] }>) {
        const { content, media } = event.detail;
        const current = editorComponent?.getEditorMarkdown() ?? '';
        const newDraft = current ? `${current}\n\n${content}` : content;
        editorComponent?.setEditorMarkdown(newDraft);
        attachmentModalOpen = false;
        pastedText = '';
        pastedFiles = [];
    }

    function handleGifSelected(event: CustomEvent<{ gif: GifItem; media: GifMedia }>) {
        dispatch('send', { content: '', media: [event.detail.media] });
        gifDropdownOpen = false;
    }

    function handleEmojiSelect(event: CustomEvent<{ emoji: string }>) {
        const current = editorComponent?.getEditorMarkdown() ?? '';
        editorComponent?.setEditorMarkdown(current + event.detail.emoji);
        emojiPickerOpen = false;
        editorComponent?.focusEditor();
    }

    // Sync initial draft when opened
    $: if (isOpen && editorComponent && initialDraft) {
        editorComponent.setEditorMarkdown(initialDraft);
    }
</script>

{#if isOpen}
    <div class="full-editor-overlay">
        <div class="full-editor-container">
            <div class="editor-pane">
                <div class="editor-header">
                    <h3>{$_('full_editor.title')}</h3>
                    <div class="editor-actions">
                        <button 
                            class="icon-btn" 
                            on:click={handleClose} 
                            title={$_('full_editor.close')}
                            aria-label={$_('full_editor.close')}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div class="markdown-toolbar">
                    <button class="tool-btn" on:click={toggleBold} title={$_('full_editor.bold')}>
                        <Bold size={16} />
                    </button>
                    <button class="tool-btn" on:click={toggleItalic} title={$_('full_editor.italic')}>
                        <Italic size={16} />
                    </button>
                    <button class="tool-btn" on:click={toggleUnderline} title={$_('full_editor.underline')}>
                        <Underline size={16} />
                    </button>
                    <button class="tool-btn" on:click={toggleStrike} title={$_('full_editor.strikethrough')}>
                        <Strikethrough size={16} />
                    </button>
                    <button class="tool-btn" on:click={toggleSpoiler} title={$_('full_editor.spoiler')}>
                        <Eye size={16} />
                    </button>
                    <button class="tool-btn" on:click={toggleCode} title={$_('full_editor.code')}>
                        <Code size={16} />
                    </button>

                    <span class="toolbar-divider"></span>

                    <button class="tool-btn" on:click={insertHeading} title={$_('full_editor.heading')}>
                        <Heading size={16} />
                    </button>
                    <button class="tool-btn" on:click={insertQuote} title={$_('full_editor.quote')}>
                        <Quote size={16} />
                    </button>
                    <button class="tool-btn" on:click={insertBulletList} title={$_('full_editor.bullet_list')}>
                        <List size={16} />
                    </button>
                    <button class="tool-btn" on:click={insertOrderedList} title={$_('full_editor.ordered_list')}>
                        <ListOrdered size={16} />
                    </button>
                    <button class="tool-btn" on:click={insertLink} title={$_('full_editor.link')}>
                        <Link2 size={16} />
                    </button>
                    <button class="tool-btn" on:click={insertHorizontalRule} title={$_('full_editor.horizontal_rule')}>
                        <Minus size={16} />
                    </button>
                    <button class="tool-btn" on:click={insertInlineMath} title={$_('full_editor.inline_math')}>
                        <Sigma size={16} />
                    </button>

                    <!-- 
                    <span class="toolbar-divider"></span>
                    <button class="tool-btn" on:click={insertTableHere} title={$_('full_editor.insert_table', { default: 'Insert table' })}>
                        <Table size={16} />
                    </button>
                    <button class="tool-btn" on:click={addRow} title={$_('full_editor.add_row', { default: 'Add row' })}>
                        <Rows size={16} />
                        <Plus size={10} class="sub-icon" />
                    </button>
                    <button class="tool-btn" on:click={removeRow} title={$_('full_editor.remove_row', { default: 'Remove row' })}>
                        <Rows size={16} />
                        <Minus size={10} class="sub-icon" />
                    </button>
                    <button class="tool-btn" on:click={addColumn} title={$_('full_editor.add_column', { default: 'Add column' })}>
                        <Columns size={16} />
                        <Plus size={10} class="sub-icon" />
                    </button>
                    <button class="tool-btn" on:click={removeColumn} title={$_('full_editor.remove_column', { default: 'Remove column' })}>
                        <Columns size={16} />
                        <Minus size={10} class="sub-icon" />
                    </button>
                    -->
                </div>

                <div class="editor-workspace">
                    <CodeMirrorEditor
                        hotkeyAction="send_message_full_editor"
                        bind:this={editorComponent}
                        variant="full"
                        initialValue={initialDraft}
                        placeholder={placeholderText}
                        on:change={handleEditorChange}
                        on:submit={handleEditorSubmit}
                    />
                </div>

                <div class="editor-toolbar">
                    <div class="toolbar-left">
                        <button 
                            class="icon-btn" 
                            on:click={() => attachmentModalOpen = true}
                            title={$_('message_input.attach_file')}
                        >
                            <Paperclip size={20} />
                        </button>
                        
                        <div class="relative-wrapper">
                            <button 
                                class="icon-btn" 
                                bind:this={emojiButtonRef}
                                on:click={() => emojiPickerOpen = !emojiPickerOpen}
                                title={$_('message_input.select_emoji')}
                            >
                                <Smile size={20} />
                            </button>
                            <EmojiPicker
                                isOpen={emojiPickerOpen}
                                isMobile={chatContext?.isMobile ?? false}
                                triggerButton={emojiButtonRef}
                                on:close={() => emojiPickerOpen = false}
                                on:select={handleEmojiSelect}
                            />
                        </div>

                        <div class="relative-wrapper">
                            <button 
                                class="icon-btn" 
                                bind:this={gifButtonRef}
                                on:click={() => gifDropdownOpen = !gifDropdownOpen}
                                title={$_('message_input.select_gif')}
                            >
                                <ImagePlay size={20} />
                            </button>
                            {#if chatId}
                                <GifPicker
                                    isOpen={gifDropdownOpen}
                                    isMobile={chatContext?.isMobile ?? false}
                                    triggerButton={gifButtonRef}
                                    on:close={() => gifDropdownOpen = false}
                                    on:selected={handleGifSelected}
                                />
                            {/if}
                        </div>
                    </div>

                    <button 
                        class="send-btn" 
                        on:click={handleSend}
                        disabled={!currentDraft?.trim()}
                        title={sendKeyHint}
                    >
                        <Send size={18} />
                        <span>{$_('full_editor.send')}</span>
                    </button>
                </div>
            </div>

            <div class="chat-pane">
                <Bar noCenter={true}>
                    <ChatHeader
                        chatContext={chatContext}
                        on:back={handleClose}
                    />
                </Bar>        
                <div class="chat-messages-wrapper">
                    <MessageList 
                        chatContext={chatContext}
                    />
                </div>

                <div class="chat-input-wrapper">
                    <MessageInput 
                        chatContext={chatContext}
                        chatId={chatId}
                        allowFullEditor={false}
                        bind:this={rightMessageInputComponent}
                    />
                </div>
            </div>

        </div>

        {#if chatId}
            <AttachmentModal
                chatId={chatId}
                isOpen={attachmentModalOpen}
                isMobile={chatContext?.isMobile ?? false}
                initialContent={pastedText}
                initialFiles={pastedFiles}
                on:close={() => {
                    attachmentModalOpen = false;
                    pastedText = '';
                    pastedFiles = [];
                }}
                on:sent={handleAttachmentSent}
            />
        {/if}
    </div>
{/if}

<style>
    .full-editor-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        box-sizing: border-box;
    }

    .full-editor-container {
        width: 100vw;
        height: 100vh;
        max-width: 100vw;
        background: var(--color-bg);
        border-radius: 0;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        display: flex;
        overflow: hidden;
        border: none; 
    }

    .editor-pane {
        flex: 7;
        display: flex;
        flex-direction: column;
        border-right: 1px solid var(--color-border);
        min-width: 0;
        background: var(--color-bg-elevated);
    }

    .editor-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--color-border);
        background: var(--color-bg-elevated);
    }

    .editor-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text);
    }

    .markdown-toolbar {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 6px 12px;
        border-bottom: 1px solid var(--color-border);
        background: var(--color-bg-elevated);
        flex-wrap: wrap;
    }

    .tool-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        color: var(--color-text);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all 0.15s ease;
        opacity: 0.75;
    }

    .tool-btn:hover {
        background: var(--color-bg);
        opacity: 1;
    }

    .tool-btn:active {
        transform: scale(0.95);
    }

    .toolbar-divider {
        width: 1px;
        height: 20px;
        background: var(--color-border);
        margin: 0 6px;
    }

    .editor-workspace {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background: var(--color-bg);
        min-height: 0;
    }

    .editor-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        border-top: 1px solid var(--color-border);
        background: var(--color-bg-elevated);
        gap: 12px;
    }

    .toolbar-left {
        display: flex;
        gap: 4px;
    }

    .chat-pane {
        flex: 4;
        display: flex;
        flex-direction: column;
        min-width: 480px;
        background: var(--color-bg);
    }

    .chat-messages-wrapper {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    .chat-input-wrapper {
        border-top: 1px solid var(--color-border);
    }

    .icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        background: transparent;
        color: var(--color-text);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all 0.15s ease;
        opacity: 0.7;
    }

    .icon-btn:hover {
        background: var(--color-bg);
        opacity: 1;
    }

    .relative-wrapper {
        position: relative;
    }

    .send-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 18px;
        background: var(--color-accent);
        color: var(--color-button-text);
        border: none;
        border-radius: var(--radius-sm);
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .send-btn:hover:not(:disabled) {
        filter: var(--hover-filter);
        transform: translateY(-1px);
    }

    .send-btn:active:not(:disabled) {
        transform: translateY(0);
    }

    .send-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    @media (max-width: 900px) {
        .full-editor-overlay {
            padding: 0;
            backdrop-filter: none;
            background: var(--color-bg);
        }

        .full-editor-container {
            height: 100vh;
            max-width: 100vw;
            border-radius: 0;
            border: none;
        }

        .chat-pane {
            display: none;
        }

        .editor-pane {
            flex: 1; 
            min-width: unset;
            border-right: none;
        }
    }
</style>