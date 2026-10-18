import { useEffect, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isSpeechSynthesisSupported, localeToBcp47, pickVoice } from '../utils/speech';

interface SpeakButtonProps {
  text: string;
  className?: string;
  title?: string;
}

/**
 * Speaker button that reads the given text aloud via the browser-native
 * speechSynthesis API, using a voice matching the current i18n locale when one
 * is available (silent fallback to the default voice otherwise). Renders
 * nothing if speechSynthesis is unsupported or the text is empty.
 */
export default function SpeakButton({ text, className = '', title = 'Read aloud' }: SpeakButtonProps) {
  const { i18n } = useTranslation();
  const [speaking, setSpeaking] = useState(false);
  const supported = isSpeechSynthesisSupported();

  useEffect(() => () => { try { window.speechSynthesis?.cancel?.(); } catch { /* noop */ } }, []);

  if (!supported || !text) return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = localeToBcp47(i18n.language);
    const voice = pickVoice(utter.lang);
    if (voice) utter.voice = voice;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utter);
    setSpeaking(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-lg border transition flex-shrink-0 ${
        speaking
          ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
          : 'bg-white border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-300'
      } ${className}`}
    >
      {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
    </button>
  );
}
