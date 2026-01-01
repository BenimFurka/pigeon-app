import { getLocaleFromNavigator, init, locale, register } from 'svelte-i18n';

export const SUPPORTED_LOCALES = ['en', 'ru'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const FALLBACK_LOCALE: SupportedLocale = 'en';

const hasNavigator = typeof navigator !== 'undefined';
let initialized = false;

const normalizeLocale = (target?: string | null): SupportedLocale => {
  if (!target) {
    return FALLBACK_LOCALE;
  }

  const lowered = target.toLowerCase();
  const match = SUPPORTED_LOCALES.find((code) => lowered === code || lowered.startsWith(`${code}-`));
  return match ?? FALLBACK_LOCALE;
};

const registerLocales = () => {
  register('en', () => import('./translations/en.json'));
  register('ru', () => import('./translations/ru.json'));
};

export const setupI18n = (initialLocale?: string | null) => {
  if (initialized) {
    if (initialLocale) {
      changeLocale(initialLocale);
    }
    return;
  }

  registerLocales();

  const navigatorLocale = hasNavigator
    ? normalizeLocale(
        getLocaleFromNavigator({
          fallback: FALLBACK_LOCALE,
          locales: [...SUPPORTED_LOCALES]
        })
      )
    : FALLBACK_LOCALE;

  init({
    fallbackLocale: FALLBACK_LOCALE,
    initialLocale: normalizeLocale(initialLocale) ?? navigatorLocale
  });

  initialized = true;
};

export const changeLocale = (nextLocale: string) => {
  locale.set(normalizeLocale(nextLocale));
};

export { locale };
