<script lang="ts">
  import { audioPlayer } from '$lib/stores/audioPlayer';
  import { onDestroy } from 'svelte';
  import { Play, Pause, Volume2, VolumeX, X } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';

  let progress = 0;
  let volumeSliderVisible = false;
  let currentVolume = 0.7;

  const unsubscribe = audioPlayer.subscribe(state => {
    if (state.duration > 0) {
      progress = (state.currentTime / state.duration) * 100;
    } else {
      progress = 0;
    }
    currentVolume = state.volume;
  });

  function handleSeek(e: MouseEvent) {
    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.min(1, Math.max(0, x / rect.width));
    audioPlayer.seekTo(percent * getDuration());
  }

  function getDuration(): number {
    let dur = 0;
    audioPlayer.subscribe(s => dur = s.duration)();
    return dur;
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  let state;
  audioPlayer.subscribe(s => state = s);

  onDestroy(() => unsubscribe());

  function getMediaTitle(media: any): string {
    return media.file_name || (media.type === 'Voice' ? 'Голосовое сообщение' : 'Аудио');
  }
</script>

{#if state?.media}
  <div class="global-audio-player">
    <!-- Контент теперь в одну строку -->
    <div class="player-content">
      <button
        on:click={state.isPlaying ? audioPlayer.pause : audioPlayer.play}
        class="control-btn play-pause"
        title={state.isPlaying ? "Пауза" : "Воспроизвести"}
      >
        {#if state.isPlaying}
          <Pause size={16} />
        {:else}
          <Play size={16} />
        {/if}
      </button>

      <div class="track-info">
        <div class="track-name" title={getMediaTitle(state.media)}>
          {getMediaTitle(state.media)}
        </div>
      </div>

      <div class="track-time">
        {formatTime(state.currentTime)} / {formatTime(state.duration)}
      </div>

      <div class="volume-control">
        <button
          on:click={() => volumeSliderVisible = !volumeSliderVisible}
          class="control-btn volume-btn"
          title="Регулировка громкости"
        >
          {#if currentVolume === 0}
            <VolumeX size={16} />
          {:else}
            <Volume2 size={16} />
          {/if}
        </button>
        {#if volumeSliderVisible}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            bind:value={currentVolume}
            on:input={(e) => audioPlayer.setVolume(parseFloat(e.target.value))}
            class="volume-slider"
            orient="vertical"

          />
        {/if}
      </div>

      <button
        on:click={audioPlayer.stop}
        class="control-btn close-btn"
        title="Закрыть"
      >
        <X size={16} />
      </button>
    </div>

    <div class="progress-bar" on:mousedown={handleSeek}>
      <div class="progress-fill" style="width: {progress}%"></div>
    </div>
  </div>
{/if}

<style>
  .global-audio-player {
    background: var(--color-bg-elevated);
    border-top: 1px solid var(--border-color);
    backdrop-filter: blur(12px); /* Размытие фона */
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    display: flex; /* Используем flexbox */
    flex-direction: column; /* Располагаем элементы по вертикали */
  }

  .progress-bar {
    height: 3px; /* Высота полосы прогресса */
    background: var(--color-surface);
    cursor: pointer;
    position: relative;
    order: 2; /* Полоса прогресса первая */
  }

  .progress-fill {
    height: 100%;
    background: var(--color-accent);
    width: 0%;
    transition: width 0.1s linear;
  }

  .player-content {
    display: flex;
    align-items: center;
    gap: 8px; /* Уменьшенный отступ между элементами */
    padding: 6px 12px; /* Уменьшенные отступы */
    position: relative;
    order: 1; /* Контент второй */
  }

  .control-btn {
    background: transparent; /* Прозрачный фон */
    border: none;
    border-radius: 50%; /* Круглая форма */
    width: 24px; /* Уменьшенная ширина */
    height: 24px; /* Уменьшенная высота */
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-text); /* Цвет иконки */
    padding: 0; /* Убираем внутренние отступы */
    transition: background-color 0.2s ease; /* Плавный переход для hover */
  }

  .control-btn:hover {
    background: var(--hover-background); /* Лёгкий фон при наведении */
  }

  .play-pause {
    /* Наследует стили control-btn */
  }

  .track-info {
    flex: 1; /* Растягиваемое пространство для названия */
    min-width: 0; /* Позволяет обрезаться тексту */
    margin-right: 8px; /* Отступ справа от названия */
  }

  .track-name {
    font-size: 0.9rem; /* Увеличенный размер шрифта */
    font-weight: 500;
    white-space: nowrap; /* Текст в одну строку */
    overflow: hidden; /* Скрытие лишнего */
    text-overflow: ellipsis; /* Обрезка точками */
    color: var(--color-text);
    margin: 0; /* Убираем стандартные отступы */
    padding: 0; /* Убираем внутренние отступы */
  }

  .track-time {
    font-size: 0.8rem; /* Размер шрифта времени */
    color: var(--color-text-muted); /* Цвет времени */
    white-space: nowrap; /* Время в одну строку */
    margin: 0 6px 0 0; /* Отступы для времени */
    flex-shrink: 0; /* Не сжимаем время */
  }

  .volume-control {
    position: relative; /* Для позиционирования слайдера */
    display: flex;
    align-items: center;
    gap: 0; /* Отступ между кнопкой и слайдером */
  }

  .volume-slider {
    width: 70px;
    position: absolute;
    bottom: calc(100% + 4px); /* Появляется над кнопкой */
    right: 0;
    background: var(--color-bg-elevated);
    border: 1px solid var(--border-color); /* Добавляем рамку */
    border-radius: 4px; /* Закругление */
    padding: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* Тень */
    z-index: 1001; /* Поверх других элементов */
    appearance: slider-vertical; /* Пытаемся сделать слайдер вертикальным (браузер может игнорировать) */
  }

  /* Стили для вертикального слайдера */
  .volume-slider {
     writing-mode: bt-lr; /* Поддержка IE/Edge */
     -webkit-appearance: slider-vertical; /* Поддержка WebKit */
     width: 8px;
     height: 70px;
     padding: 0 5px;
  }


  .close-btn {
    /* Наследует стили control-btn */
    color: var(--color-text-muted); /* Цвет крестика */
  }

  .close-btn:hover,
  .volume-btn:hover {
    background: var(--hover-background); /* Стиль hover для кнопок */
  }

  /* Стили для кнопки регулировки громкости */
  .volume-btn {
    /* Наследует стили control-btn */
  }
</style>