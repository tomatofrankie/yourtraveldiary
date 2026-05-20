import { useState, useEffect } from 'react';

type Translations = Record<string, string>;

let zhTW: Translations | null = null;

async function loadZhTW(): Promise<Translations> {
  if (zhTW) return zhTW;
  const { default: data } = await import('./i18n.zhTW');
  zhTW = data;
  return zhTW;
}

export function t(key: string): string {
  const lang = localStorage.getItem('appLanguage') || 'en';
  if (lang === 'zh-TW' && zhTW) return zhTW[key] ?? key;
  return key;
}

export function useTranslation() {
  const [lang, setLang] = useState(() => localStorage.getItem('appLanguage') || 'en');
  const [ready, setReady] = useState(() => {
    const l = localStorage.getItem('appLanguage') || 'en';
    return l !== 'zh-TW' || zhTW !== null;
  });

  useEffect(() => {
    const handler = async () => {
      const current = localStorage.getItem('appLanguage') || 'en';
      if (current === 'zh-TW' && !zhTW) {
        await loadZhTW();
        setReady(true);
      }
      setLang(current);
    };
    window.addEventListener('languagechange', handler);
    // Load on mount if zh-TW is already selected
    handler();
    return () => window.removeEventListener('languagechange', handler);
  }, []);

  const translate = (key: string): string => {
    if (lang === 'zh-TW' && zhTW) return zhTW[key] ?? key;
    return key;
  };

  return { t: translate, lang, ready };
}
