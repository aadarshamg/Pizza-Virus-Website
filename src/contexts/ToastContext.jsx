import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

// Replaces the app's Alert.alert popups with non-blocking toasts.
const ToastContext = createContext({});

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const seq = useRef(0);

    const dismiss = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);

    // toast({ title, message, type: 'success' | 'error' | 'info', action: { label, onClick } })
    const toast = useCallback((opts) => {
        const id = ++seq.current;
        setToasts(t => [...t.slice(-2), { id, type: 'info', ...opts }]);
        setTimeout(() => dismiss(id), opts.duration || 4000);
    }, [dismiss]);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
                {toasts.map(t => (
                    <div key={t.id} className="pointer-events-auto w-full max-w-md bg-ink text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 animate-toast">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'error' ? 'bg-red-500' : 'bg-brand'}`}>
                            {t.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            {t.title && <p className="text-sm font-extrabold">{t.title}</p>}
                            {t.message && <p className="text-xs text-slate-300 font-medium">{t.message}</p>}
                        </div>
                        {t.action && (
                            <button onClick={() => { t.action.onClick(); dismiss(t.id); }}
                                className="bg-brand hover:bg-brand-cta text-white text-xs font-extrabold px-3 py-2 rounded-xl shrink-0">
                                {t.action.label}
                            </button>
                        )}
                        <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-white shrink-0" aria-label="Dismiss">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
