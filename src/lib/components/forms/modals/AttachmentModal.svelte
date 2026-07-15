<!-- TODO: Paste -->
<script lang="ts">
    import { createEventDispatcher, tick } from 'svelte';
    import { uploadAttachment } from '$lib/api';
    import type { MessageMedia } from '$lib/types/models';
    import { X, Upload, Image, Video, Music, FileText, Plus } from 'lucide-svelte';
    import Button from '$lib/components/shared/Button.svelte';
    import Modal from '$lib/components/overlays/Modal.svelte';
    import { _, format } from 'svelte-i18n';
    import { getServerUrl } from '$lib/config';
    import { getMediaTitle, getMediaSubtitle } from '$lib/utils/media';

    // Props
    export let chatId: number;
    export let isOpen: boolean = false;
    export let isMobile: boolean = false;
    export let initialContent: string = '';
    export let initialFiles: File[] = [];

    // Constants
    const MAX_FILE_SIZE = 8 * 1024 * 1024;

    // Event dispatcher
    const dispatch = createEventDispatcher<{
        close: void;
        sent: { content: string; media: MessageMedia[] };
    }>();

    // State
    let files: File[] = [];
    let uploadedMedia: MessageMedia[] = [];
    let uploadingFiles = new Set<number>();
    let messageContent = '';
    let isDragging = false;
    let error: string | null = null;
    let hasInitialized = false;

    // DOM refs
    let inputElement: HTMLTextAreaElement;
    let fileInput: HTMLInputElement;
    let selectFilesButton: HTMLButtonElement;

    // Event handlers
    function handleClose() {
        if (uploadingFiles.size === 0) {
            resetState();
            dispatch('close');
        }
    }

    function handleFileSelect(event: Event) {
        const target = event.target as HTMLInputElement;
        if (target.files) {
            addFiles(Array.from(target.files));
        }
    }

    function handleDragOver(event: DragEvent) {
        if (!isMobile) {
            event.preventDefault();
            isDragging = true;
        }
    }

    function handleDragLeave(event: DragEvent) {
        if (!isMobile) {
            event.preventDefault();
            isDragging = false;
        }
    }

    function handleDrop(event: DragEvent) {
        if (!isMobile) {
            event.preventDefault();
            isDragging = false;
            
            if (event.dataTransfer?.files) {
                addFiles(Array.from(event.dataTransfer.files));
            }
        }
    }

    function handleSend() {
        if (uploadedMedia.length === 0 && !messageContent.trim()) {
            error = $_('attachments.add_files_or_message');
            return;
        }

        if (uploadingFiles.size > 0) {
            error = $_('attachments.wait_for_upload');
            return;
        }

        dispatch('sent', {
            content: messageContent.trim(),
            media: uploadedMedia
        });

        resetState();
        dispatch('close');
    }

    // Utility functions
    function adjustTextareaHeight() {
        if (!inputElement) return;
        inputElement.style.height = 'auto';
        const maxHeight = 200;
        const newHeight = Math.min(Math.max(inputElement.scrollHeight, 40), maxHeight);
        inputElement.style.height = `${newHeight}px`;
    }

    function addFiles(newFiles: File[]) {
        const validFiles = newFiles.filter(file => {
            if (file.size > MAX_FILE_SIZE) {
                error = $format('attachments.file_too_large', { values: { fileName: file.name, maxSize: '8MB' } });
                return false;
            }
            return true;
        });
        files = [...files, ...validFiles];
        error = null;
        
        validFiles.forEach((file, index) => {
            uploadFile(file, files.length - validFiles.length + index);
        });
    }

    async function uploadFile(file: File, index: number) {
        uploadingFiles.add(index);
        error = null;
        
        try {
            const response = await uploadAttachment(chatId, file);
            if (response.data) {
                const mediaData = response.data as unknown as MessageMedia;
                uploadedMedia = [...uploadedMedia, mediaData];
            }
        } catch (err) {
            error = $_('attachments.upload_error');
            files = files.filter((_, i) => i !== index);
        } finally {
            uploadingFiles.delete(index);
        }
    }

    function removeMedia(index: number) {
        uploadedMedia = uploadedMedia.filter((_, i) => i !== index);
        files = files.filter((_, i) => i !== index);
        uploadingFiles.delete(index);
    }

    function resetState() {
        files = [];
        uploadedMedia = [];
        messageContent = '';
        error = null;
        isDragging = false;
    }

    function getFileIcon(media: MessageMedia) {
        switch (media.type) {
            case 'Photo':
                return Image;
            case 'Video':
                return Video;
            case 'Audio':
            case 'Voice':
                return Music;
            default:
                return FileText;
        }
    }
    
    function getUrl(path: string): string {
        const baseUrl = getServerUrl();
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${baseUrl}/${cleanPath}`;
    }

    function handlePasteInModal(event: ClipboardEvent) {
        const items = event.clipboardData?.items;
        if (!items) return;

        const newFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && item.type) {
                const file = item.getAsFile();
                if (file) {
                    newFiles.push(file);
                }
            }
        }

        if (newFiles.length > 0) {
            event.preventDefault();
            addFiles(newFiles);
        }
    }

    $: if (!isOpen) {
        files = [];
        uploadedMedia = [];
        messageContent = '';
        error = null;
        isDragging = false;
        hasInitialized = false;
    }

    $: if (isOpen && !hasInitialized) {
        if (initialContent) {
            messageContent = initialContent;
        }
        if (initialFiles.length > 0) {
            addFiles(initialFiles);
        }
        hasInitialized = true;
        
        tick().then(() => {
            inputElement?.focus();
        });
    }
</script>

<Modal
    open={isOpen}
    title={$_('attachments.send_attachments')}
    showClose={true}
    maxWidth="600px"
    disabled={uploadingFiles.size > 0}
    on:close={handleClose}
>
    <div class="attachment-modal-content" on:paste={handlePasteInModal}>
        {#if error}
            <div class="error-message">{error}</div>
        {/if}

        <input
            type="file"
            bind:this={fileInput}
            on:change={handleFileSelect}
            multiple
            style="display: none;"
        />
        {#if files.length === 0}
            <div class="attachment-group">
                <div class="group-header">
                    <Upload size={18} />
                    <span>{$_('attachments.file_upload')}</span>
                </div>
                <div 
                    class="file-upload-area" 
                    class:dragging={isDragging}
                    role="button"
                    tabindex="0"
                    on:dragover={handleDragOver}
                    on:dragleave={handleDragLeave}
                    on:drop={handleDrop}
                >
                    <Upload size={32} />
                    <p>{$_('attachments.drag_files_or')}</p>
                    <button
                        type="button"
                        class="select-files-button"
                        bind:this={selectFilesButton}
                        on:click={() => fileInput?.click()}
                    >
                        {$_('attachments.select_files')}
                    </button>
                    <p class="hint">{$format('attachments.max_file_size', { values: { size: '8MB' } })}</p>
                </div>
            </div>
        {/if}

        {#if uploadedMedia.length > 0 || uploadingFiles.size > 0 || files.length > 0}
            <div class="attachment-group">
                <div class="group-header">
                    <FileText size={18} />
                    <span>{$format('attachments.attachments_count', { values: { count: uploadedMedia.length } })}</span>
                </div>
                <div class="attachments-grid">
                    {#each files as file, index}
                        {@const isUploading = uploadingFiles.has(index)}
                        {@const media = uploadedMedia[index]}
                        <div class="attachment-item"> <!-- class:uploading={isUploading}>-->
                            {#if media}
                                {@const Icon = getFileIcon(media)}
                                <div class="attachment-preview">
                                    {#if media.type === 'Photo' && media.thumbnail_url}
                                        <img src={getUrl(media.thumbnail_url)} alt={getMediaTitle(media)} />
                                    {:else if media.type === 'Video' && media.thumbnail_url}
                                        <img src={getUrl(media.thumbnail_url)} alt={getMediaTitle(media)} />
                                    {:else}
                                        <Icon size={24} />
                                    {/if}
                                </div>
                                <div class="attachment-info">
                                    <div class="attachment-name">{getMediaTitle(media)}</div>
                                    <div class="attachment-meta">
                                        {getMediaSubtitle(media)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    class="remove-button"
                                    on:click={() => removeMedia(index)}
                                    aria-label={$_('common.remove')}
                                >
                                    <X size={16} />
                                </button>
                            {:else if isUploading}
                                <div class="attachment-preview">
                                    <Upload size={24} class="spinning-icon" />
                                </div>
                                <div class="attachment-info">
                                    <div class="attachment-name">{file.name}</div>
                                    <div class="attachment-meta">{$_('common.uploading')}...</div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                    <div 
                        class="attachment-item add-more-card"
                        role="button"
                        tabindex="0"
                        on:click={() => fileInput?.click()}
                    >
                        <div class="attachment-preview">
                            <Plus size={24} />
                        </div>
                        <div class="attachment-info">
                            <div class="attachment-name">{$_('attachments.add_more_files')}</div>
                        </div>
                    </div>
                </div>

                <div class="message-input-section">
                    <textarea
                        id="message-content"
                        bind:value={messageContent}
                        on:input={adjustTextareaHeight}
                        bind:this={inputElement}
                        placeholder={$_('attachments.add_message_text')}
                        class="message-textarea"
                        rows="3"
                    ></textarea>
                </div>
            </div>
        {/if}
    </div>

    <div slot="footer" class="attachment-modal-footer">
        <Button
            on:click={handleClose}
            variant="outline"
            disabled={uploadingFiles.size > 0}
        >
            {$_('common.cancel')}
        </Button>
        <Button
            on:click={handleSend}
            disabled={uploadingFiles.size > 0 || (uploadedMedia.length === 0 && !messageContent.trim())}
        >
            {$_('common.send')}
        </Button>
    </div>
</Modal>

<style>
    .attachment-modal-content {
        display: flex;
        flex-direction: column;
        gap: 20px;
        color: var(--color-text);
    }

    .attachment-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        border-radius: var(--radius-sm);
        background: var(--surface-glass);
    }

    .group-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 4px;
    }

    .error-message {
		color: var(--color-danger);
		margin-bottom: 15px;
		background: var(--color-danger-soft);
		padding: 10px;
		border-radius: 4px;
		border-left: 3px solid var(--color-danger);
		transition: opacity 0.5s;
    }

    .file-upload-area {
        border: 2px dashed var(--color-border, rgba(255, 255, 255, 0.2));
        border-radius: 8px;
        padding: 40px 20px;
        text-align: center;
        transition: all 0.2s;
        cursor: pointer;
        background: var(--color-bg-elevated);
    }

    .file-upload-area p {
        margin: 12px 0 8px;
        color: var(--color-text);
    }

    .file-upload-area .hint {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        margin-top: 8px;
    }

    .select-files-button {
        background: var(--color-accent);
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        color: var(--color-text);
        cursor: pointer;
        font-size: 0.9rem;
        margin-top: 8px;
        transition: transform 0.2s;
    }

    .select-files-button:hover {
        transform: scale(1.05);
    }

    .attachments-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
    }

    .attachment-item {
        position: relative;
        background: var(--color-bg-elevated);
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
    }

    .attachment-preview {
        width: 100%;
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        overflow: hidden;
    }

    .attachment-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .attachment-info {
        flex: 1;
        min-width: 0;
    }

    .attachment-name {
        font-size: 0.85rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .attachment-meta {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-top: 4px;
    }

    .remove-button {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.6);
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: white;
        transition: background-color 0.2s;
    }

    .remove-button:hover {
        background: rgba(0, 0, 0, 0.8);
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .message-input-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .message-textarea {
        flex: 1;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        background: var(--color-bg-elevated);
        border: none;
        border-radius: var(--radius-sm);
        padding: 10px 10px;
        color: var(--color-text);
        font-size: 14px;
        outline: none;
        transition: var(--transition);
        min-height: 40px;
        max-height: 200px;
        resize: none;
        line-height: 1.4;
        box-sizing: border-box; 
    }

    .message-textarea:focus {
        border-color: var(--color-accent);
    }

    .attachment-modal-footer {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        width: 100%;
    }

    .add-more-card {
        background: var(--color-bg-elevated);
        border: 1px dashed var(--color-border, rgba(255, 255, 255, 0.2));
        cursor: pointer;
        transition: all 0.2s;
    }

    .add-more-card:hover {
        background: var(--color-bg-hover);
        border-color: var(--color-accent);
    }

    @media (max-width: 576px) {
        .file-upload-area {
            padding: 30px 16px;
        }

        .attachments-grid {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        }

        .attachment-modal-footer {
            flex-direction: column;
        }
    }
</style>