import React, { useState, useEffect } from 'react';
import { Share, Plus, X } from 'lucide-react';

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if already installed (standalone mode)
    const checkStandalone = () => {
      return window.matchMedia('(display-mode: standalone)').matches || 
             (window.navigator as any).standalone === true;
    };
    
    const standalone = checkStandalone();

    // 2. Check if user already dismissed the prompt
    const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt');

    // 3. Detect iOS vs Android
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    // 4. Android PWA Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone && !hasSeenPrompt) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. iOS Prompt (Show after 3 seconds if not installed and not dismissed)
    let timer: NodeJS.Timeout;
    if (ios && !standalone && !hasSeenPrompt) {
      timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('hasSeenInstallPrompt', 'true');
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-4 border border-purple-100 flex flex-col gap-3 relative">
        <button 
          onClick={dismiss}
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 p-1"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-4 pr-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-300 to-purple-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-inner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21.5 4c0 0-2-.5-3.5-2L14.5 5.5 6.3 3.7C5.9 3.6 5.5 3.8 5.3 4.1L4 6.7l5.5 5.5-5.5 5.5-3.8-1 1.6 3.8c.2.4.6.6 1 .5L11 19l5.5-5.5 5.5 5.5 2.6-1.3c.3-.2.5-.6.4-1z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Install App</h3>
            <p className="text-sm text-gray-500 leading-tight mt-0.5">Add to home screen for fullscreen & offline access!</p>
          </div>
        </div>

        {isIOS ? (
          <div className="bg-purple-50 rounded-xl p-3.5 text-sm text-purple-900 flex flex-col gap-2.5 mt-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">1.</span>
              <span>Tap the</span>
              <span className="bg-white p-1 rounded shadow-sm"><Share size={16} className="text-blue-500" /></span>
              <span>button below.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">2.</span>
              <span>Scroll and tap</span>
              <span className="font-semibold flex items-center gap-1 bg-white px-1.5 py-0.5 rounded shadow-sm">
                <Plus size={14} /> Add to Home Screen
              </span>
            </div>
          </div>
        ) : deferredPrompt ? (
          <button 
            onClick={handleInstallClick}
            className="w-full bg-purple-500 text-white font-medium py-2.5 rounded-xl mt-1 hover:bg-purple-600 transition-colors active:bg-purple-700"
          >
            Install Now
          </button>
        ) : (
          <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-900 mt-1">
            Tap the browser menu (⋮) and select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
          </div>
        )}
      </div>
    </div>
  );
}
