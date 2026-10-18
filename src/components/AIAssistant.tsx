import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, ChevronDown, Sprout, TrendingUp, CloudRain, Leaf, Shield } from 'lucide-react'
import { apiService } from '../services/api'
import MicButton from './MicButton'
import SpeakButton from './SpeakButton'
import { AI_NOTICE_VERSION } from '../utils/aiGovernance'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
}

const QUICK_PROMPTS = [
  { icon: Sprout, label: 'Best crop for this season?', text: 'What are the best crops I can plant this season in India?' },
  { icon: TrendingUp, label: 'Market prices now?', text: 'What are current market prices for major crops in India?' },
  { icon: CloudRain, label: 'Weather impact advice', text: 'How does the current weather affect my crops and what should I do?' },
  { icon: Leaf, label: 'Improve soil health', text: 'What are the best practices to improve soil health organically?' },
]

const AIAssistant = () => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: 'Namaste! 🌾 I am your KisanWise AI Assistant. Ask me anything about crop planning, market prices, weather impact, pest control, or farming best practices!',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showGovModal, setShowGovModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [messages, open])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const response = await apiService.askAIAssistant(text.trim())
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.answer || response.reply || 'I could not get a response right now. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: '⚠️ Unable to reach the AI right now. Please check your connection and try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        id="ai-assistant-toggle"
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-warm-200 text-warm-700 rotate-180'
            : 'bg-gradient-to-br from-primary-600 to-primary-800 text-white hover:scale-110'
        }`}
        title={open ? 'Close AI Assistant' : 'Open AI Assistant'}
      >
        {open ? <ChevronDown className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          id="ai-assistant-panel"
          className="fixed bottom-24 right-6 z-50 w-96 max-h-[78vh] flex flex-col rounded-2xl shadow-2xl border border-warm-200 overflow-hidden animate-slide-up"
          style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 60%)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary-700 to-primary-800">
            <div className="w-8 h-8 rounded-full bg-accent-400/30 flex items-center justify-center">
              <Bot className="h-4 w-4 text-accent-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">KisanWise AI Assistant</p>
              <p className="text-xs text-white/60">Powered by Gemini · Agriculture Expert</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary-700" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-sm'
                      : 'bg-white text-warm-800 shadow-sm border border-warm-100 rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                  {msg.role === 'assistant' && <SpeakButton text={msg.text} className="mt-1.5" />}
                  <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/50' : 'text-warm-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary-700" />
                </div>
                <div className="px-4 py-3 bg-white rounded-2xl rounded-tl-sm shadow-sm border border-warm-100">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts (shown only when 1 message = greeting) */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 grid grid-cols-2 gap-1.5">
              {QUICK_PROMPTS.map(({ icon: Icon, label, text }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(text)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-warm-200 rounded-xl text-xs font-medium text-warm-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition text-left"
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0 text-primary-500" />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-warm-100 bg-white">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                id="ai-assistant-input"
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about crops, weather, markets…"
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm bg-warm-50 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent disabled:opacity-60 placeholder-warm-400"
              />
              <MicButton onTranscribe={(t) => setInput(t)} title="Speak your question" />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            {/* AI Governance notice footer link */}
            <div className="flex items-center justify-center gap-1 mt-1.5">
              <Shield className="h-3 w-3 text-warm-300 flex-shrink-0" />
              <button
                type="button"
                onClick={() => setShowGovModal(true)}
                className="text-[10px] text-warm-400 hover:text-warm-600 transition leading-none"
              >
                AI Governance &amp; Reliability Notice · predictions are estimates
              </button>
            </div>
          </div>

          {/* AI Governance re-read modal (inline, triggered from footer) */}
          {showGovModal && (
            <div className="absolute inset-0 z-10 bg-white/95 overflow-y-auto rounded-2xl p-5 text-xs text-gray-700 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900 flex items-center gap-1.5"><Shield className="h-4 w-4 text-slate-600" /> AI Governance Notice</span>
                <button onClick={() => setShowGovModal(false)} className="text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
              </div>
              <p>KisanWise uses AI — including an XGBoost price-trend predictor (~55% direction accuracy, ~1.2 pct-pt MAE) and Gemini generative AI — to assist with planning and decisions.</p>
              <ul className="space-y-1.5 text-warm-700">
                {[
                  'Predictions are statistical estimates — not guarantees.',
                  'AI outputs may contain inaccuracies. Cross-check critical advice with your local officer or mandi.',
                  'This tool aids decision-making and does not replace professional advice.',
                  'KisanWise is not liable for losses from reliance on AI outputs.',
                ].map((l, i) => <li key={i} className="flex items-start gap-1.5"><span className="text-warm-400 mt-0.5">•</span>{l}</li>)}
              </ul>
              <p className="text-warm-400">Notice {AI_NOTICE_VERSION}</p>
              <button onClick={() => setShowGovModal(false)} className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-medium hover:bg-slate-700">Close</button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default AIAssistant
