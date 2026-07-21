declare module '*.svelte' {
  import { SvelteComponentTyped } from 'svelte';
  export default class extends SvelteComponentTyped<Record<string, never>, Record<string, never>, Record<string, never>> {}
}

declare module '*.css' {
    const content: string;
    export default content;
}

declare type UnlistenFn = () => void;
