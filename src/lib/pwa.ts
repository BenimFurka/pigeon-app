import { registerSW } from 'virtual:pwa-register';

export const updateSW =
  typeof window !== 'undefined'
    ? registerSW({
        onNeedRefresh() {
          if (confirm('update')) {
            updateSW(true);
          }
        },
        onOfflineReady() {
          console.log('success');
        },
      })
    : () => {};

export function initPWA() {
  if (typeof window === 'undefined') return;

  let deferredPrompt: any = null;

  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferredPrompt = e;

    const installButton = document.getElementById('install-pwa') as HTMLButtonElement | null;
    if (installButton) {
      installButton.style.display = 'inline-flex';
      installButton.addEventListener(
        'click',
        async () => {
          if (!deferredPrompt) return;

          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;

          if (outcome === 'accepted') {
            console.log('PWA installed');
          }

          deferredPrompt = null;
          installButton.style.display = 'none';
        },
        { once: true } as any
      );
    }
  });
}

export function isRunningAsPWA(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}