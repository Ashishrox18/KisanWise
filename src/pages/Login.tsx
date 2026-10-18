import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { signInWithGoogle } from '../services/firebase';
import { Shield, Eye, EyeOff, Leaf, AlertCircle, Play } from 'lucide-react';

const ROLE_ROUTES: Record<string, string> = { farmer: '/farmer', buyer: '/buyer', admin: '/admin' };

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', role: 'farmer', phone: '', otp: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '', color: '' });

  const validatePassword = (p: string) => {
    const checks = [p.length >= 8, /[A-Z]/.test(p), /[a-z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)];
    const score = checks.filter(Boolean).length;
    const levels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', 'text-red-600', 'text-orange-500', 'text-yellow-600', 'text-blue-600', 'text-primary-700'];
    return { score, message: levels[score] || '', color: colors[score] || '' };
  };

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => setCountdown(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; }), 1000);
  };

  const handleSendOTP = async () => {
    setError('');
    if (!formData.name || !formData.email || !formData.password) {
      return setError('Please fill all required fields');
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    if (!emailOk) return setError('Please enter a valid email address');

    setLoading(true);
    try {
      let phone = formData.phone.trim();
      if (phone && !phone.startsWith('+')) phone = '+91' + phone.replace(/^0+/, '');
      await apiService.sendOTP({ name: formData.name, email: formData.email, password: formData.password, role: formData.role, phone });
      setFormData(f => ({ ...f, phone }));
      setShowOTPInput(true);
      startCountdown();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!formData.otp || formData.otp.length !== 6) return setError('Please enter the 6-digit OTP');
    setLoading(true);
    try {
      const res = await apiService.verifyOTP({ email: formData.email, otp: formData.otp });
      sessionStorage.setItem('token', res.token);
      sessionStorage.setItem('user', JSON.stringify(res.user));
      navigate(ROLE_ROUTES[res.user.role] || '/');
    } catch (e: any) {
      setError(e.response?.data?.error || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isLogin) {
      setLoading(true);
      try {
        const res = await apiService.login(formData.email, formData.password);
        sessionStorage.setItem('token', res.token);
        sessionStorage.setItem('user', JSON.stringify(res.user));
        navigate(ROLE_ROUTES[res.user.role] || '/');
      } catch (e: any) {
        if (!e.response) {
          setError('Cannot connect to backend server. Please check your backend URL and network connection.');
        } else {
          setError(e.response?.data?.error || 'Invalid credentials');
        }
      } finally {
        setLoading(false);
      }
    } else {
      showOTPInput ? await handleVerifyOTP() : await handleSendOTP();
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const firebaseUser = await signInWithGoogle();
      const idToken = await firebaseUser.getIdToken();
      // Exchange Firebase token for our backend JWT
      const res = await apiService.post('/auth/google', { idToken, role: formData.role });
      sessionStorage.setItem('token', res.token);
      sessionStorage.setItem('user', JSON.stringify(res.user));
      navigate(ROLE_ROUTES[res.user.role] || '/');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Google sign-in failed. Please use email/password for now.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const reset = () => {
    setShowOTPInput(false);
    setError('');
    setFormData(f => ({ ...f, otp: '' }));
  };

  const pwBarColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-500', 'bg-primary-600'][passwordStrength.score] || 'bg-warm-200';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 flex items-center justify-center p-4">

      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-4 backdrop-blur-sm">
            <Leaf className="h-7 w-7 text-accent-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">KisanWise</h1>
          <p className="text-white/60 text-sm mt-1">AI-powered farmer copilot</p>
          <div className="mt-4 flex justify-center">
            <a
              href="https://drive.google.com/drive/folders/1OVLyLWQWmn-Q8rLDOUTN5P77ON7mEaAD?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-semibold backdrop-blur-sm transition border border-white/20 shadow-sm hover:scale-105"
            >
              <Play className="h-3.5 w-3.5 fill-white text-white" />
              Watch Platform Demo Video
            </a>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-modal p-8 animate-slide-up">
          {/* Tab toggle */}
          <div className="flex bg-warm-100 p-1 rounded-xl mb-6">
            {['Sign In', 'Register'].map((label, i) => (
              <button
                key={label}
                id={`auth-tab-${i === 0 ? 'login' : 'register'}`}
                type="button"
                onClick={() => { setIsLogin(i === 0); reset(); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  isLogin === (i === 0)
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-warm-500 hover:text-warm-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Google OAuth button */}
          {!showOTPInput && (
            <>
              <button
                id="google-signin-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border-2 border-warm-200 rounded-xl text-sm font-semibold text-warm-700 hover:border-primary-300 hover:bg-warm-50 transition-all duration-150 disabled:opacity-50 mb-4"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-warm-200" />
                <span className="text-xs font-medium text-warm-400">or</span>
                <div className="flex-1 h-px bg-warm-200" />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Registration fields */}
            {!isLogin && !showOTPInput && (
              <>
                <div>
                  <label className="label">Full Name <span className="text-red-500">*</span></label>
                  <input id="reg-name" type="text" required className="input" placeholder="Ramesh Kumar"
                    value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
                </div>

                <div>
                  <label className="label">I am a <span className="text-red-500">*</span></label>
                  <select id="reg-role" className="input" value={formData.role}
                    onChange={e => setFormData(f => ({ ...f, role: e.target.value }))}>
                    <option value="farmer">🌾 Farmer</option>
                    <option value="buyer">🛒 Buyer</option>
                  </select>
                </div>

                <div>
                  <label className="label">Phone <span className="text-warm-400 font-normal text-xs">(optional)</span></label>
                  <input id="reg-phone" type="tel" className="input" placeholder="9876543210" maxLength={10}
                    value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </>
            )}

            {/* OTP verification */}
            {!isLogin && showOTPInput && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-xl border border-primary-100">
                  <Shield className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-primary-800">Check your email</p>
                    <p className="text-xs text-primary-600 mt-0.5">We sent a 6-digit OTP to <strong>{formData.email}</strong></p>
                    <p className="text-xs text-primary-500 mt-1">💡 Dev mode: use OTP <strong>123456</strong></p>
                  </div>
                </div>

                <div>
                  <label className="label">Enter OTP <span className="text-red-500">*</span></label>
                  <input id="otp-input" type="text" required maxLength={6} className="input text-center text-2xl tracking-[0.75em] font-mono"
                    placeholder="——————"
                    value={formData.otp}
                    onChange={e => setFormData(f => ({ ...f, otp: e.target.value.replace(/\D/g, '') }))} />
                </div>

                <div className="flex justify-between text-sm">
                  <button type="button" disabled={countdown > 0 || loading} onClick={handleSendOTP}
                    className="text-primary-600 hover:text-primary-700 disabled:text-warm-400 font-medium transition-colors">
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </button>
                  <button type="button" onClick={reset} className="text-warm-500 hover:text-warm-700 font-medium transition-colors">
                    Change email
                  </button>
                </div>
              </div>
            )}

            {/* Email + password (login + registration pre-OTP) */}
            {(isLogin || !showOTPInput) && (
              <>
                <div>
                  <label className="label">Email {!isLogin && <span className="text-red-500">*</span>}</label>
                  <input id="email-input" type="email" required className="input" placeholder="you@example.com"
                    value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} />
                </div>

                <div>
                  <label className="label">Password {!isLogin && <span className="text-red-500">*</span>}</label>
                  <div className="relative">
                    <input id="password-input" type={showPassword ? 'text' : 'password'} required minLength={8}
                      className="input pr-10"
                      placeholder={isLogin ? '••••••••' : 'Min. 8 characters'}
                      value={formData.password}
                      onChange={e => {
                        setFormData(f => ({ ...f, password: e.target.value }));
                        if (!isLogin) setPasswordStrength(validatePassword(e.target.value));
                      }} />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {!isLogin && formData.password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-warm-500">Strength:</span>
                        <span className={`text-xs font-semibold ${passwordStrength.color}`}>{passwordStrength.message}</span>
                      </div>
                      <div className="h-1 bg-warm-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pwBarColor}`} style={{ width: `${(passwordStrength.score / 5) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Submit */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isLogin ? 'Sign In' : showOTPInput ? 'Verify & Create Account' : 'Send OTP'}
            </button>
          </form>

          {/* Demo accounts */}
          {isLogin && (
            <div className="mt-5 p-4 bg-warm-50 rounded-xl border border-warm-200">
              <p className="text-xs font-semibold text-warm-600 mb-2 uppercase tracking-wider">Demo Accounts</p>
              <div className="space-y-1">
                <p className="text-xs text-warm-600">🌾 <span className="font-medium">farmer@gmail.com</span> / Password@123</p>
                <p className="text-xs text-warm-600">🛒 <span className="font-medium">buyer@gmail.com</span> / Password@123</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
