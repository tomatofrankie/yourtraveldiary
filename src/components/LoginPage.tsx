import { useState } from 'react';
import { Plane, Eye, EyeOff, Lock, Mail, UserPlus, LogIn } from 'lucide-react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import { auth } from '../utils/firebase';
import { createAccountWithIdentifier, signInWithIdentifier } from '../utils/authHelpers';

interface LoginPageProps {
  onLogin: () => void;
}

export function isAuthenticated(): boolean {
  return !!auth.currentUser;
}

export async function logout(): Promise<void> {
  await auth.signOut();
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);

  const triggerError = (message: string) => {
    setError(message);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const getFirebaseErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered.';
      case 'auth/username-already-in-use':
        return 'This username is already taken.';
      case 'auth/invalid-username':
        return 'Please enter a valid username (3-20 letters, numbers, dot, underscore, or hyphen).';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password is too short. Firebase requires at least 6 characters.';
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Incorrect email/username or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      case 'auth/operation-not-allowed':
      case 'auth/configuration-not-found':
        return 'Email/Password sign-in is not enabled in Firebase. Please go to Firebase Console → Authentication → Sign-in method → enable Email/Password.';
      default:
        return code ? `Signup failed: ${code}` : 'Something went wrong. Please try again.';
    }
  };

  const applyPersistence = async () => {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await applyPersistence();

      if (mode === 'signup') {
        if (password !== confirmPassword) {
          triggerError('Passwords do not match.');
          setLoading(false);
          return;
        }
        await createAccountWithIdentifier(identifier.trim(), password);
      } else {
        await signInWithIdentifier(identifier.trim(), password);
      }

      onLogin();
    } catch (err: any) {
      console.error('Firebase auth error:', err);
      triggerError(getFirebaseErrorMessage(err?.code || ''));
    } finally {
      setLoading(false);
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
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? 'Sign in with your email or username' : 'Create an account with email or username'}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-5 border border-purple-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email or Username
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError('');
              }}
              placeholder="Enter your email or username (test)"
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-colors ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              autoFocus
              autoComplete={mode === 'login' ? 'username' : 'username'}
              required
            />
            {mode === 'signup' && (
              <p className="mt-2 text-xs text-gray-500">
                You can sign up with either a real email address or a unique username.
              </p>
            )}
          </div>

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
                placeholder={mode === 'login' ? 'Enter your password (test123)' : 'Create a password'}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-colors pr-12 ${
                  error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Confirm your password"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-colors pr-12 ${
                    error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span> {error}
            </p>
          )}

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
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-400 to-purple-500 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-purple-600 transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
              setIdentifier('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-purple-600 hover:text-purple-700"
          >
            {mode === 'login' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {mode === 'login' ? 'Create new account' : 'Back to sign in'}
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
