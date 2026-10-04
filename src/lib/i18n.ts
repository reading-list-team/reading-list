export const i18n = {
  getMessage(key: string, substitutions?: string | string[]): string {
    return chrome.i18n.getMessage(key, substitutions) || key;
  },
  number(value: number): string {
    const locale = chrome.i18n.getUILanguage?.() || navigator.language || 'en';
    return new Intl.NumberFormat(locale.replace('_', '-')).format(value);
  },
  language(): string {
    return (
      chrome.i18n.getUILanguage?.() ||
      navigator.language ||
      'en'
    ).replace('_', '-');
  },
};
