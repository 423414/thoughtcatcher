import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function UpdatePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/thoughtcatcher/sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setShow(true);
              }
            });
          }
        });
      });

      // Also check on load
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          setShow(true);
        }
      });
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-center">
      <button
        onClick={() => {
          setShow(false);
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then((reg) => {
              reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
            });
          }
          window.location.reload();
        }}
        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30 font-medium text-sm animate-bounce"
      >
        <RefreshCw className="w-4 h-4" />
        新版本可用，点击更新
      </button>
    </div>
  );
}
