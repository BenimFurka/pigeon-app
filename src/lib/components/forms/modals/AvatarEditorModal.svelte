<script lang="ts">
    import { createEventDispatcher, onDestroy, tick } from 'svelte';
    import Modal from '$lib/components/overlays/Modal.svelte';
    import { _ } from 'svelte-i18n';

    export let open: boolean = false;
    export let file: File | null = null;
    export let zIndex: number = 1100;

    const dispatch = createEventDispatcher<{
        close: void;
        save: { file: File };
    }>();

    let canvas: HTMLCanvasElement | null = null;
    let image: HTMLImageElement | null = null;
    let objectUrl: string | null = null;
    let scale = 1;
    let minScale = 0.5;
    let maxScale = 3;
    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let outputSize = 256;
    let ready = false;
    let saving = false;
    let error: string | null = null;

    const VIEW = 280;
    const BORDER_RADIUS_RATIO = 0.227; // 22.7%
    const CORNER_RADIUS = VIEW * BORDER_RADIUS_RATIO;

    $: if (open && file) {
        loadFile(file);
    }

    $: if (!open) {
        cleanup();
    }

    function roundedRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
    ) {
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            return;
        }
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    async function loadFile(f: File) {
        cleanup();
        error = null;
        ready = false;
        objectUrl = URL.createObjectURL(f);
        const img = new Image();
        img.onload = async () => {
            image = img;
            const fit = Math.max(VIEW / img.width, VIEW / img.height);
            minScale = fit;
            maxScale = fit * 4;
            scale = fit;
            offsetX = (VIEW - img.width * scale) / 2;
            offsetY = (VIEW - img.height * scale) / 2;
            ready = true;
            await tick();
            draw();
        };
        img.onerror = () => {
            error = $_('avatar_editor.load_error');
        };
        img.src = objectUrl;
    }

    function cleanup() {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
        }
        image = null;
        ready = false;
        dragging = false;
        error = null;
        saving = false;
    }

    function draw() {
        if (!canvas || !image) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, VIEW, VIEW);

        ctx.save();
        roundedRect(ctx, 0, 0, VIEW, VIEW, CORNER_RADIUS);
        ctx.clip();
        ctx.drawImage(image, offsetX, offsetY, image.width * scale, image.height * scale);
        ctx.restore();

        ctx.save();
        roundedRect(ctx, 1, 1, VIEW - 2, VIEW - 2, CORNER_RADIUS - 1);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    function onPointerDown(e: PointerEvent) {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
        if (!dragging) return;
        offsetX += e.clientX - lastX;
        offsetY += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        draw();
    }

    function onPointerUp() {
        dragging = false;
    }

    function onWheel(e: WheelEvent) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const next = Math.min(maxScale, Math.max(minScale, scale + delta * scale));
        const cx = VIEW / 2;
        const cy = VIEW / 2;
        offsetX = cx - ((cx - offsetX) * next) / scale;
        offsetY = cy - ((cy - offsetY) * next) / scale;
        scale = next;
        draw();
    }

    function onScaleInput() {
        draw();
    }

    function handleClose() {
        dispatch('close');
    }

    async function handleSave() {
        if (!image || !file) return;
        saving = true;
        error = null;
        try {
            const out = document.createElement('canvas');
            out.width = outputSize;
            out.height = outputSize;
            const ctx = out.getContext('2d');
            if (!ctx) throw new Error('No canvas context');

            const ratio = outputSize / VIEW;
            const outRadius = outputSize * BORDER_RADIUS_RATIO;
            roundedRect(ctx, 0, 0, outputSize, outputSize, outRadius);
            ctx.clip();
            ctx.drawImage(
                image,
                offsetX * ratio,
                offsetY * ratio,
                image.width * scale * ratio,
                image.height * scale * ratio
            );

            const blob = await new Promise<Blob | null>((resolve) =>
                out.toBlob(resolve, 'image/png')
            );
            if (!blob) throw new Error('Failed to export image');

            const baseName = (file.name || 'avatar').replace(/\.[^.]+$/, '');
            const result = new File([blob], `${baseName}.png`, { type: 'image/png' });
            dispatch('save', { file: result });
            dispatch('close');
        } catch (err) {
            error = err instanceof Error ? err.message : $_('avatar_editor.save_error');
        } finally {
            saving = false;
        }
    }

    onDestroy(cleanup);
</script>

<Modal
    open={open}
    title={$_('avatar_editor.title')}
    showClose={true}
    maxWidth="400px"
    zIndex={zIndex}
    on:close={handleClose}
>
    <div class="avatar-editor">
        {#if error}
            <div class="error">{error}</div>
        {/if}

        <div
            class="canvas-wrap"
            on:wheel={onWheel}
            role="presentation"
        >
            <canvas
                bind:this={canvas}
                width={VIEW}
                height={VIEW}
                class="preview"
                class:ready
                on:pointerdown={onPointerDown}
                on:pointermove={onPointerMove}
                on:pointerup={onPointerUp}
                on:pointercancel={onPointerUp}
            ></canvas>
            {#if !ready}
                <div class="loading">{$_('avatar_editor.loading')}</div>
            {/if}
        </div>

        <label class="scale-label" for="avatar-scale">
            {$_('avatar_editor.zoom')}
        </label>
        <input
            id="avatar-scale"
            type="range"
            min={minScale}
            max={maxScale}
            step="0.01"
            bind:value={scale}
            on:input={onScaleInput}
            disabled={!ready}
        />

        <p class="hint">{$_('avatar_editor.hint')}</p>

        <div class="actions">
            <button class="btn outline" on:click={handleClose} disabled={saving}>
                {$_('common.cancel')}
            </button>
            <button class="btn" on:click={handleSave} disabled={!ready || saving}>
                {#if saving}
                    {$_('avatar_editor.saving')}
                {:else}
                    {$_('avatar_editor.apply')}
                {/if}
            </button>
        </div>
    </div>
</Modal>

<style>
    .avatar-editor {
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
    }

    .canvas-wrap {
        position: relative;
        width: 280px;
        height: 280px;
        margin: 0 auto;
        /* Та же форма, что и в JS-коде (BORDER_RADIUS_RATIO = 0.227) */
        border-radius: 22.7%;
        overflow: hidden;
        /* Прозрачный фон вместо var(--color-bg), чтобы видеть реальную прозрачность canvas */
        background: transparent;
        touch-action: none;
        user-select: none;
    }

    .preview {
        width: 100%;
        height: 100%;
        cursor: grab;
        display: block;
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    .preview.ready {
        opacity: 1;
    }

    .preview:active {
        cursor: grabbing;
    }

    .loading {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-muted);
        font-size: 0.9rem;
    }

    .scale-label {
        font-size: 0.85rem;
        color: var(--color-text-muted);
    }

    input[type='range'] {
        width: 100%;
        accent-color: var(--color-accent);
    }

    .hint {
        margin: 0;
        font-size: 0.85rem;
        color: var(--color-text-muted);
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
    }

    .error {
        background: var(--color-danger-soft);
        color: var(--color-danger);
        padding: 8px 10px;
        border-radius: var(--radius-sm);
        font-size: 0.9rem;
    }
</style>