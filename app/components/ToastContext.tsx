'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
}

interface ToastCtx {
  showToast: (message: string, type?: ToastType) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idCounter;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 200);
    }, 3000);
  }, []);

  const icons: Record<ToastType, string> = { success: '✓', error: '✗', info: '→' };
  const colors: Record<ToastType, string> = {
    success: 'border-[#22c55e]/25 bg-[#22c55e]/8 text-[#22c55e]',
    error:   'border-[#ef4444]/25 bg-[#ef4444]/8 text-[#ef4444]',
    info:    'border-[#6c63ff]/25 bg-[#6c63ff]/8 text-[#a78bfa]',
  };

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[99998] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border font-mono text-xs backdrop-blur-md
              ${colors[t.type]} ${t.exiting ? 'toast-exit' : 'toast-enter'}`}
          >
            <span className="text-sm">{icons[t.type]}</span>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
