/**
 * speech.ts — browser-native Web Speech API helpers (NO external APIs,
 * credentials, or backend). Feature-detection + locale→BCP-47 mapping +
 * voice selection for text-to-speech.
 */

export function getSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported(): boolean {
  return !!getSpeechRecognition();
}

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.speechSynthesis.speak === 'function'
  );
}

/** Map an i18n locale code (e.g. 'hi', 'te', 'en') to a BCP-47 speech tag. */
const BCP47: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', te: 'te-IN', gu: 'gu-IN', pa: 'pa-IN',
  mr: 'mr-IN', ta: 'ta-IN', kn: 'kn-IN', bn: 'bn-IN', as: 'as-IN',
  or: 'or-IN', ml: 'ml-IN', ur: 'ur-IN',
};

export function localeToBcp47(locale?: string): string {
  if (!locale) return 'en-IN';
  const base = locale.split('-')[0].toLowerCase();
  return BCP47[base] || `${base}-IN`;
}

/** Pick a speechSynthesis voice matching the BCP-47 tag (exact, then language
 *  prefix), else undefined so the browser uses its default voice. */
export function pickVoice(bcp47: string): SpeechSynthesisVoice | undefined {
  if (!isSpeechSynthesisSupported()) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;
  const tag = bcp47.toLowerCase();
  const prefix = tag.split('-')[0];
  return (
    voices.find((v) => v.lang.toLowerCase() === tag) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
    undefined
  );
}
