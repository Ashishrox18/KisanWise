import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getSpeechRecognition, isSpeechRecognitionSupported, localeToBcp47 } from '../utils/speech';

interface MicButtonProps {
  /** Receives the final transcribed text. */
  onTranscribe: (text: string) => void;
  /** If true, the transcript replaces the field; otherwise it appends. */
  replace?: boolean;
  className?: string;
  title?: string;
}

/**
 * Mic button that transcribes speech → text via the browser-native Web Speech
 * API (window.SpeechRecognition / webkitSpeechRecognition) and feeds it to the
 * parent, in the user's currently selected i18n locale. Renders nothing if the
 * browser has no SpeechRecognition support.
 */
export default function MicButton({ onTranscribe, replace = true, className = '', title = 'Voice input' }: MicButtonProps) {
  const { i18n } = useTranslation();
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => () => { try { recRef.current?.stop?.(); } catch { /* noop */ } }, []);

  if (!isSpeechRecognitionSupported()) return null;

  const stop = () => {
    try { recRef.current?.stop?.(); } catch { /* noop */ }
    setListening(false);
  };

  const start = () => {
    const SR = getSpeechRecognition();
    if (!SR) return;
    const rec = new SR();
    rec.lang = localeToBcp47(i18n.language);
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join('').trim();
      if (text) onTranscribe(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { setListening(false); }
  };

  const toggle = () => (listening ? stop() : start());

  return (
    <button
      type="button"
      onClick={toggle}
      title={title}
      aria-label={title}
      className={`p-2 rounded-lg border transition flex-shrink-0 ${
        listening
          ? 'bg-red-50 border-red-300 text-red-600 animate-pulse'
          : 'bg-white border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-300'
      } ${className}`}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
