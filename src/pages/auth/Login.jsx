import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input } from '../../components/ui';
import AuthShell from './AuthShell';

export function GoogleButton({ next }) {
    const { signInWithGoogle } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const go = async () => {
        setLoading(true);
        try {
            await signInWithGoogle(next);
        } catch (e) {
            toast({ type: 'error', title: 'Google Sign-In Failed', message: e.message });
            setLoading(false);
        }
    };
    return (
        <Button type="button" variant="ghost" className="w-full py-3.5 bg-white border-2 border-slate-200 hover:bg-slate-50" loading={loading} onClick={go}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
            Continue with Google
        </Button>
    );
}

export default function Login() {
    const { user, signInWithEmail, resetPasswordForEmail } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = params.get('next') || '/';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [forgot, setForgot] = useState(false);

    if (user) return <Navigate to={next} replace />;

    const submit = async (e) => {
        e.preventDefault();
        if (!email || !password) return toast({ type: 'error', title: 'Missing Fields', message: 'Please enter your email and password.' });
        setLoading(true);
        try {
            await signInWithEmail(email.trim(), password);
            navigate(next, { replace: true });
        } catch (err) {
            toast({ type: 'error', title: 'Login Failed', message: err.message });
            setLoading(false);
        }
    };

    const sendReset = async (e) => {
        e.preventDefault();
        if (!email) return toast({ type: 'error', title: 'Missing Email', message: 'Please enter your account email.' });
        setLoading(true);
        try {
            await resetPasswordForEmail(email.trim());
            toast({ type: 'success', title: 'Check your email', message: 'We sent you a link to reset your password.' });
            setForgot(false);
        } catch (err) {
            toast({ type: 'error', title: 'Reset Failed', message: err.message });
        } finally {
            setLoading(false);
        }
    };

    if (forgot) {
        return (
            <AuthShell title="Reset Password" subtitle="Enter your account email and we'll send you a reset link.">
                <form onSubmit={sendReset} className="space-y-4">
                    <Input label="Email" icon={Mail} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                    <Button type="submit" className="w-full py-4" loading={loading}>Send Reset Link</Button>
                </form>
                <button onClick={() => setForgot(false)} className="w-full mt-4 text-sm font-bold text-slate-500 hover:text-ink">← Back to Sign In</button>
            </AuthShell>
        );
    }

    return (
        <AuthShell title="Welcome back" subtitle="Sign in to order and track your pizzas."
            footer={<>New to Pizza Virus? <Link to={`/signup?next=${encodeURIComponent(next)}`} className="font-extrabold text-brand">Create an account</Link></>}>
            <form onSubmit={submit} className="space-y-4">
                <Input label="Email" icon={Mail} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                <Input label="Password" icon={Lock} type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} />
                <div className="text-right -mt-2">
                    <button type="button" onClick={() => setForgot(true)} className="text-xs font-bold text-brand">Forgot password?</button>
                </div>
                <Button type="submit" className="w-full py-4" loading={loading}>Sign In</Button>
            </form>
            <div className="flex items-center gap-3 my-5 text-xs font-bold text-slate-400"><span className="h-px flex-1 bg-slate-200" />OR<span className="h-px flex-1 bg-slate-200" /></div>
            <GoogleButton next={next} />
            <p className="text-[0.6875rem] text-slate-400 text-center mt-5">
                By continuing you agree to our <Link to="/legal/terms" className="underline">Terms</Link> and <Link to="/legal/privacy" className="underline">Privacy Policy</Link>.
            </p>
        </AuthShell>
    );
}
