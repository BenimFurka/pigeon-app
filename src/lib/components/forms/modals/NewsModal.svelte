<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Modal from '$lib/components/overlays/Modal.svelte';
    import type { News } from '$lib/types/models';
    import MediaList from '$lib/components/media/MediaList.svelte';
    import { markNewsAsRead } from '$lib/api';
    import { newsEnabled } from '$lib/stores/news';
    import { md, normalizeMarkdown } from '$lib/utils/markdown';

    // Props
    export let isOpen = false;
    export let news: News;

    // Event dispatcher
    const dispatch = createEventDispatcher<{
        close: void;
    }>();

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

<style lang="scss">
    @import '../../../../styles/markdown/markdown.scss';
    @import '../../../../styles/components/modal';

    .footer-field {
        @extend .footer-field;
    }

    .content {
        @extend .modal-content;
    }

    .media-section {
        width: 100%;
    }

    .news-text {
        @extend .markdown-content;
    }
</style>
