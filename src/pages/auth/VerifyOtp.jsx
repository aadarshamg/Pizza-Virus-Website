import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui';
import AuthShell from './AuthShell';

export default function VerifyOtp() {
    const { verifySignUpOtp, resendSignUpOtp } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const email = params.get('email');
    const next = params.get('next') || '/';
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    if (!email) return <Navigate to="/signup" replace />;

    const verify = async (e) => {
        e.preventDefault();
        if (code.length !== 6) return toast({ type: 'error', title: 'Invalid Code', message: 'Please enter the 6-digit code sent to your email.' });
        setLoading(true);
        try {
            await verifySignUpOtp(email, code);
            navigate(next, { replace: true });
        } catch (err) {
            toast({ type: 'error', title: 'Verification Failed', message: err.message });
            setLoading(false);
        }
    };

    const resend = async () => {
        setResending(true);
        try {
            await resendSignUpOtp(email);
            toast({ type: 'success', title: 'Code Sent', message: 'A new verification code has been sent to your email.' });
        } catch (err) {
            toast({ type: 'error', title: 'Resend Failed', message: err.message });
        } finally {
            setResending(false);
        }
    };

    return (
        <AuthShell title="Verify your email" subtitle={<>Enter the 6-digit code we sent to <b className="text-ink">{email}</b></>}>
            <form onSubmit={verify} className="space-y-4">
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric" autoComplete="one-time-code" placeholder="000000" autoFocus aria-label="Verification code"
                    className="w-full text-center text-3xl font-extrabold tracking-[0.5em] bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 outline-none focus:border-brand-light" />
                <Button type="submit" className="w-full py-4" loading={loading}>Verify</Button>
            </form>
            <button onClick={resend} disabled={resending} className="w-full mt-4 text-sm font-bold text-brand disabled:opacity-50">
                {resending ? 'Sending...' : "Didn't get it? Resend code"}
            </button>
        </AuthShell>
    );
}
