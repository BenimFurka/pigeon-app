import { writable } from 'svelte/store';

export const windowHeight = writable(0);

if (typeof window !== 'undefined') {
  const update = () => {
    windowHeight.set(window.innerHeight);
    document.documentElement.style.setProperty(
      '--window-height', 
      `${window.innerHeight}px`
    );
  };
  
  update();
  window.addEventListener('resize', update);
}