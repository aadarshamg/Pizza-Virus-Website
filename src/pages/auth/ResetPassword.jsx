import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PASSWORD_HINT, isValidPassword } from '../../utils/passwordValidation';
import { Button, Input } from '../../components/ui';
import AuthShell from './AuthShell';

// Landing page for the password-reset email link. supabase-js reads the recovery tokens
// from the URL and signs the user in, so updateUser() can set the new password.
export default function ResetPassword() {
    const { session, updatePassword } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    if (!session) {
        return (
            <AuthShell title="Link expired" subtitle="This password reset link is invalid or has expired.">
                <Button to="/login" className="w-full py-4">Back to Sign In</Button>
            </AuthShell>
        );
    }

    const submit = async (e) => {
        e.preventDefault();
        if (!password || !confirm) return toast({ type: 'error', title: 'Missing Fields', message: 'Please fill in both password fields.' });
        if (!isValidPassword(password)) return toast({ type: 'error', title: 'Error', message: `Password must be ${PASSWORD_HINT.toLowerCase()}` });
        if (password !== confirm) return toast({ type: 'error', title: 'Error', message: 'Passwords do not match' });
        setLoading(true);
        try {
            await updatePassword(password);
            toast({ type: 'success', title: 'Password updated', message: 'You are now signed in.' });
            navigate('/', { replace: true });
        } catch (err) {
            toast({ type: 'error', title: 'Reset Failed', message: err.message });
            setLoading(false);
        }
    };

    return (
        <AuthShell title="Set a new password" footer={<Link to="/" className="font-bold text-slate-500">Cancel</Link>}>
            <form onSubmit={submit} className="space-y-4">
                <Input label="New Password" icon={Lock} type="password" autoComplete="new-password" placeholder={PASSWORD_HINT} value={password} onChange={e => setPassword(e.target.value)} />
                <Input label="Confirm Password" icon={Lock} type="password" autoComplete="new-password" placeholder="Re-enter password" value={confirm} onChange={e => setConfirm(e.target.value)} />
                <Button type="submit" className="w-full py-4" loading={loading}>Update Password</Button>
            </form>
        </AuthShell>
    );
}
