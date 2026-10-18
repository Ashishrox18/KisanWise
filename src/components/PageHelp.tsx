import { useState, useRef, useEffect } from 'react';
import { Info, X, ChevronRight, Lightbulb, CheckCircle, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface HelpStep {
  icon: string;
  title: string;
  desc: string;
}

interface PageHelpProps {
  pageKey?: string;
}

const resolvePageKey = (pathname: string): string => {
  if (pathname === '/farmer' || pathname === '/farmer/') return 'dashboard';
  if (pathname.includes('/crop-planning')) return 'cropPlanning';
  if (pathname.includes('/quality-assessment') || pathname.includes('/buyer/quality')) return 'qualityAssessment';
  if (pathname.includes('/selling-strategy')) return 'sellingStrategy';
  if (pathname.includes('/harvest')) return 'harvestManagement';
  if (pathname.includes('/list-produce')) return 'listProduce';
  if (pathname.includes('/my-listings') || pathname.includes('/listing/')) return 'myListings';
  if (pathname.includes('/browse-procurement') || pathname.includes('/farmer/procurement-request')) return 'procurement';
  if (pathname === '/buyer' || pathname === '/buyer/') return 'buyerDashboard';
  if (pathname.includes('/buyer/procurement') || pathname.includes('/buyer/create-procurement') || pathname.includes('/buyer/my-procurement')) return 'buyerProcurement';
  if (pathname.includes('/invoices')) return 'invoices';
  if (pathname.includes('/profile')) return 'profile';
  if (pathname.includes('/admin')) return 'adminDashboard';
  return 'dashboard';
};

const DEMO_VIDEO_URL = 'https://drive.google.com/drive/folders/1OVLyLWQWmn-Q8rLDOUTN5P77ON7mEaAD?usp=sharing';

export default function PageHelp({ pageKey: explicitKey }: PageHelpProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeKey = explicitKey || resolvePageKey(location.pathname);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('open-page-help', handleOpen);
    return () => window.removeEventListener('open-page-help', handleOpen);
  }, []);

  const title    = t(`help.${activeKey}.title`,    { defaultValue: '' });
  const subtitle = t(`help.${activeKey}.subtitle`, { defaultValue: '' });
  const tip      = t(`help.${activeKey}.tip`,      { defaultValue: '' });

  const features: string[] = [];
  let fi = 0;
  while (true) {
    const f = t(`help.${activeKey}.features.${fi}`, { defaultValue: '__MISSING__' });
    if (f === '__MISSING__') break;
    features.push(f);
    fi++;
  }

  const steps: HelpStep[] = [];
  let si = 0;
  while (true) {
    const stepTitle = t(`help.${activeKey}.steps.${si}.title`, { defaultValue: '__MISSING__' });
    if (stepTitle === '__MISSING__' || si > 10) break;
    steps.push({
      icon:  t(`help.${activeKey}.steps.${si}.icon`,  { defaultValue: String(si + 1) }),
      title: stepTitle,
      desc:  t(`help.${activeKey}.steps.${si}.desc`,  { defaultValue: '' }),
    });
    si++;
  }

  if (!title) return null;

  return (
    <>
      {/* Floating subtle 'i' button */}
      <div className="fixed bottom-6 right-24 z-40">
        <button
          onClick={() => setOpen(true)}
          title={t('help.howToUse', { defaultValue: 'How to use this page' })}
          className="group flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 hover:text-indigo-600 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 p-3 hover:px-4 border border-gray-200"
          aria-label={t('help.howToUse', { defaultValue: 'How to use this page' })}
        >
          <div className="w-5 h-5 rounded-full bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center font-serif font-bold text-xs italic">
            i
          </div>
          <span className="text-xs font-semibold overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-200 whitespace-nowrap">
            {t('help.howToUse', { defaultValue: 'How to use' })}
          </span>
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in Help Drawer */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-serif font-bold text-xs italic">
                i
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest opacity-90">
                {t('help.pageGuide', { defaultValue: 'Page Guide' })}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/20 transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <h2 className="text-xl font-bold leading-tight">{title}</h2>
          {subtitle && <p className="text-indigo-100 text-sm mt-1 leading-relaxed">{subtitle}</p>}

          {/* Quick Demo Video Link inside header */}
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
            <span className="text-xs text-indigo-200">Want to see a live walkthrough?</span>
            <a
              href={DEMO_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-bold transition shadow-sm"
            >
              <Play className="h-3 w-3 fill-indigo-700" />
              Watch Demo
            </a>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {features.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                {t('help.whatYouCanDo', { defaultValue: 'What you can do here' })}
              </h3>
              <ul className="space-y-2.5">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {steps.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-indigo-500" />
                {t('help.howToGet', { defaultValue: 'How to get started' })}
              </h3>
              <ol className="space-y-3">
                {steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 bg-warm-50 p-3 rounded-xl border border-warm-100">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                      {step.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                      {step.desc && (
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{step.desc}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {tip && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <span className="text-xl flex-shrink-0">💡</span>
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                    {t('help.proTip', { defaultValue: 'Pro Tip' })}
                  </p>
                  <p className="text-sm text-amber-800 leading-relaxed">{tip}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50">
          <button
            onClick={() => setOpen(false)}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition shadow"
          >
            {t('help.gotIt', { defaultValue: 'Got it, let me explore!' })}
          </button>
        </div>
      </div>
    </>
  );
}
