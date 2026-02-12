import { useState, useEffect } from 'react';
import { Plane, Eye, EyeOff, Lock } from 'lucide-react';

// The app password — change this to your desired password
const APP_PASSWORD = ;

const AUTH_KEY = 'tripplanner_auth';
const REMEMBER_KEY = 'tripplanner_remember';

interface LoginPageProps {
  onLogin: () => void;
}

export function isAuthenticated(): boolean {
  // Check session (sessionStorage) or remembered (localStorage)
  const sessionAuth = sessionStorage.getItem(AUTH_KEY);
  const rememberedAuth = localStorage.getItem(AUTH_KEY);
  return sessionAuth === 'true' || rememberedAuth === 'true';
}

export function logout(): void {
  sessionStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    // Check if "remember me" was previously set
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered === 'true') {
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password === APP_PASSWORD) {
      // Save auth state
      sessionStorage.setItem(AUTH_KEY, 'true');

      if (rememberMe) {
        localStorage.setItem(AUTH_KEY, 'true');
        localStorage.setItem(REMEMBER_KEY, 'true');
      } else {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(REMEMBER_KEY);
      }

      onLogin();
    } else {
      setError('Incorrect password. Please try again.');
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-purple-200 rounded-full opacity-30 animate-pulse" />
        <div className="absolute top-1/4 right-10 w-16 h-16 bg-purple-300 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-purple-100 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-10 right-1/4 w-12 h-12 bg-purple-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className={`w-full max-w-sm ${shaking ? 'animate-shake' : ''}`}>
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-300 to-purple-500 rounded-2xl shadow-lg mb-4">
            <Plane className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Our Travel Diary</h1>
          <p className="text-sm text-gray-500 mt-1">Enter password to continue</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-5 border border-purple-100">
          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="w-4 h-4 inline mr-1" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter your password"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-colors pr-12 ${
                  error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                autoFocus
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <span>⚠️</span> {error}
              </p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-400 cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-sm text-gray-600 cursor-pointer select-none">
              Remember me on this device
            </label>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-purple-400 to-purple-500 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-purple-600 transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Enter Diary
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          ✈️ Plan your trips, track expenses, share memories
        </p>
      </div>

      {/* Shake animation style */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
