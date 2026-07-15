<!-- TODO: -->
<script lang="ts">

    import { createEventDispatcher, onMount, tick } from 'svelte';
    import { Search, X } from 'lucide-svelte';
    import { _ } from 'svelte-i18n';

    export let isOpen: boolean = false;
    export let isMobile: boolean = false;
    export let triggerButton: HTMLButtonElement | null = null;
    export let asPopover: boolean = true;

    const dispatch = createEventDispatcher<{
        close: void;
        select: { emoji: string };
    }>();

    const EMOJI_CATEGORIES: { id: string; labelKey: string; emojis: string[] }[] = [
        {
            id: 'smileys',
            labelKey: 'emoji_picker.smileys',
            emojis: [
                '😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘',
                '😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒',
                '😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡',
                '🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶',
                '😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴',
                '🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀',
                '☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'
            ]
        },
        {
            id: 'gestures',
            labelKey: 'emoji_picker.gestures',
            emojis: [
                '👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆',
                '🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️',
                '💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀',
                '👁','👅','👄','💋','🩸'
            ]
        },
        {
            id: 'hearts',
            labelKey: 'emoji_picker.hearts',
            emojis: [
                '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
                '💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈',
                '♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️'
            ]
        },
        {
            id: 'animals',
            labelKey: 'emoji_picker.animals',
            emojis: [
                '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵',
                '🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗',
                '🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷','🕸',
                '🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳'
            ]
        },
        {
            id: 'food',
            labelKey: 'emoji_picker.food',
            emojis: [
                '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝',
                '🍅','🍆','🥑','🥦','🥬','🥒','🌶','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐',
                '🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭',
                '🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜'
            ]
        },
        {
            id: 'travel',
            labelKey: 'emoji_picker.travel',
            emojis: [
                '🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🦯','🦽',
                '🦼','🛴','🚲','🛵','🏍','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋',
                '🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩','💺','🛰',
                '🚀','🛸','🚁','🛶','⛵','🚤','🛥','🛳','⛴','🚢','⚓','🪝','⛽','🚧','🚦','🚥'
            ]
        },
        {
            id: 'objects',
            labelKey: 'emoji_picker.objects',
            emojis: [
                '⌚','📱','📲','💻','⌨️','🖥','🖨','🖱','🖲','🕹','🗜','💽','💾','💿','📀','📼',
                '📷','📸','📹','🎥','📽','🎞','📞','☎️','📟','📠','📺','📻','🎙','🎚','🎛','🧭',
                '⏱','⏲','⏰','🕰','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯','🪔','🧯','🛢','💸',
                '💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒','🛠'
            ]
        },
        {
            id: 'symbols',
            labelKey: 'emoji_picker.symbols',
            emojis: [
                '🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔸','🔹','🔶','🔷','💠',
                '🔘','🔳','🔲','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛',
                '⬜','🟫','🔈','🔇','🔉','🔊','🔔','🔕','📣','📢','💬','💭','🗯','♠️','♣️','♥️',
                '♦️','🃏','🎴','🀄','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛'
            ]
        }
    ];

    let search = '';
    let activeCategory = EMOJI_CATEGORIES[0].id;
    let containerEl: HTMLDivElement | null = null;
    let adjustedX = 0;
    let adjustedY = 0;

    $: filtered = (() => {
        const q = search.trim().toLowerCase();
        if (!q) {
            const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory) ?? EMOJI_CATEGORIES[0];
            return cat.emojis;
        }
        return EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) => e.includes(q) || true).slice(0, 0).concat(
            EMOJI_CATEGORIES.flatMap((c) => c.emojis)
        ).filter((e, i, arr) => arr.indexOf(e) === i).slice(0, 120);
    })();

    $: displayEmojis = search.trim()
        ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e, i, arr) => arr.indexOf(e) === i)
        : (EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.emojis ?? []);

    function select(emoji: string) {
        dispatch('select', { emoji });
        dispatch('close');
    }

    function close() {
        dispatch('close');
    }

    function handleOutside(e: MouseEvent) {
        if (!isOpen || !containerEl) return;
        const target = e.target as Node;
        if (containerEl.contains(target)) return;
        if (triggerButton && triggerButton.contains(target as Node)) return;
        close();
    }

    function adjustPosition() {
        if (!asPopover || !containerEl) return;

        const width = containerEl.offsetWidth || 320;
        const height = containerEl.offsetHeight || 360;
        let left = 12;
        let top = 12;

        if (triggerButton) {
            const rect = triggerButton.getBoundingClientRect();
            left = rect.left;
            top = rect.top - height - 8;
            if (top < 8) top = rect.bottom + 8;
            if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
            if (left < 8) left = 8;
            if (top + height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - height - 8);
        }

        adjustedX = left;
        adjustedY = top;
    }

    onMount(() => {
        document.addEventListener('click', handleOutside);
        window.addEventListener('resize', adjustPosition);
        return () => {
            document.removeEventListener('click', handleOutside);
            window.removeEventListener('resize', adjustPosition);
        };
    });

    $: if (isOpen && containerEl) {
        tick().then(adjustPosition);
    }
</script>

{#if isOpen}
    <div
        class="emoji-picker"
        class:mobile={isMobile}
        class:popover={asPopover}
        bind:this={containerEl}
        style={asPopover ? `left: ${adjustedX}px; top: ${adjustedY}px` : ''}
        role="dialog"
        aria-label={$_('emoji_picker.title')}
    >
        <div class="picker-header">
            <div class="search-wrap">
                <Search size={14} class="search-icon" />
                <input
                    type="text"
                    class="search-input"
                    placeholder={$_('emoji_picker.search')}
                    bind:value={search}
                />
            </div>
            <button type="button" class="close-btn" on:click={close} aria-label={$_('common.close')}>
                <X size={16} />
            </button>
        </div>

        {#if !search.trim()}
            <div class="categories">
                {#each EMOJI_CATEGORIES as cat}
                    <button
                        type="button"
                        class="cat-btn"
                        class:active={activeCategory === cat.id}
                        on:click={() => (activeCategory = cat.id)}
                        title={$_(cat.labelKey)}
                    >
                        {cat.emojis[0]}
                    </button>
                {/each}
            </div>
        {/if}

        <div class="emoji-grid">
            {#each displayEmojis as emoji}
                <button type="button" class="emoji-btn" on:click={() => select(emoji)}>
                    {emoji}
                </button>
            {/each}
        </div>
    </div>
{/if}

<style>
    .emoji-picker {
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
        width: 320px;
        max-width: calc(100vw - 16px);
        max-height: 380px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 10000;
    }

    .emoji-picker.popover {
        position: fixed;
    }

    .emoji-picker.mobile {
        width: min(360px, calc(100vw - 16px));
    }

    .picker-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-bottom: 1px solid var(--color-border);
    }

    .search-wrap {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 6px;
        background: var(--color-bg);
        border-radius: var(--radius-sm);
        padding: 6px 8px;
    }

    .search-wrap :global(.search-icon) {
        opacity: 0.5;
        flex-shrink: 0;
    }

    .search-input {
        flex: 1;
        border: none;
        background: transparent;
        color: var(--color-text);
        font-size: 13px;
        outline: none;
        min-width: 0;
    }

    .close-btn {
        background: none;
        border: none;
        color: var(--color-text);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        opacity: 0.7;
        display: flex;
    }

    .close-btn:hover {
        opacity: 1;
        background: var(--surface-glass);
    }

    .categories {
        display: flex;
        gap: 2px;
        padding: 6px 8px;
        border-bottom: 1px solid var(--color-border);
        overflow-x: auto;
    }

    .cat-btn {
        background: none;
        border: none;
        font-size: 18px;
        padding: 4px 6px;
        border-radius: 6px;
        cursor: pointer;
        line-height: 1;
        opacity: 0.7;
    }

    .cat-btn:hover,
    .cat-btn.active {
        opacity: 1;
        background: var(--surface-glass);
    }

    .cat-btn.active {
        background: var(--color-accent-soft);
    }

    .emoji-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 2px;
        padding: 8px;
        overflow-y: auto;
        flex: 1;
    }

    .emoji-btn {
        background: none;
        border: none;
        font-size: 22px;
        line-height: 1;
        padding: 6px 2px;
        border-radius: 6px;
        cursor: pointer;
        transition: transform 0.1s ease, background 0.15s ease;
    }

    .emoji-btn:hover {
        background: var(--surface-glass);
        transform: scale(1.15);
    }
</style>
