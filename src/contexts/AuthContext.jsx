import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../utils/withTimeout';

// Web port of customer-app/src/contexts/AuthContext.jsx.
// Same auth methods (email + password, signup OTP, Google, password reset, delete account);
// Apple sign-in is iOS-only in the app and is not offered on the website.

const AuthContext = createContext({});

const AUTH_TIMEOUT_MS = 15000;

// Safety net for the DB trigger that creates a profiles row on signup -
// orders.customer_id references profiles(id), so a missing row breaks checkout.
const ensureProfile = async (user) => {
    if (!user) return;
    try {
        const { error } = await withTimeout(
            supabase.from('profiles').upsert(
                { id: user.id, name: user.user_metadata?.name || 'New Customer' },
                { onConflict: 'id', ignoreDuplicates: true }
            ),
            AUTH_TIMEOUT_MS,
            'ensureProfile_timeout'
        );
        if (error) console.warn('ensureProfile failed:', error.message);
    } catch (e) {
        console.warn('ensureProfile failed:', e.message);
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recoveryMode, setRecoveryMode] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user) ensureProfile(session.user);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            // The password-reset email link lands on /reset-password with recovery tokens
            // in the URL; supabase-js exchanges them and fires this event.
            if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
            // Defer: calling supabase inside this callback can deadlock on the auth lock.
            if (event === 'SIGNED_IN' && session?.user) {
                setTimeout(() => ensureProfile(session.user), 0);
            }
        });

        return () => subscription?.unsubscribe();
    }, []);

    const signInWithEmail = async (email, password) => {
        const { data, error } = await withTimeout(
            supabase.auth.signInWithPassword({ email, password }),
            AUTH_TIMEOUT_MS,
            'Sign-in is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
        return data;
    };

    const signUp = async (email, password, name) => {
        const { data, error } = await withTimeout(
            supabase.auth.signUp({ email, password, options: { data: { name } } }),
            AUTH_TIMEOUT_MS,
            'Sign-up is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
        return data;
    };

    const verifySignUpOtp = async (email, token) => {
        const { data, error } = await withTimeout(
            supabase.auth.verifyOtp({ email, token, type: 'signup' }),
            AUTH_TIMEOUT_MS,
            'Verification is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
        return data;
    };

    const resendSignUpOtp = async (email) => {
        const { error } = await withTimeout(
            supabase.auth.resend({ type: 'signup', email }),
            AUTH_TIMEOUT_MS,
            'Resending the code is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
    };

    // Full-page redirect to Google; the session is picked up from the URL on return.
    const signInWithGoogle = async (nextPath = '/') => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}${nextPath}` },
        });
        if (error) throw error;
    };

    const signOut = () => {
        setRecoveryMode(false);
        return withTimeout(
            supabase.auth.signOut(),
            AUTH_TIMEOUT_MS,
            'Sign-out is taking too long. Check your internet connection and try again.'
        );
    };

    // Runs via the existing delete-account edge function (it re-verifies the caller's token).
    const deleteAccount = async () => {
        const { data: { session: current } } = await supabase.auth.getSession();
        if (!current?.access_token) throw new Error('You must be signed in to delete your account.');

        const { data, error } = await withTimeout(
            supabase.functions.invoke('delete-account', {
                headers: { Authorization: `Bearer ${current.access_token}` },
            }),
            AUTH_TIMEOUT_MS,
            'Deleting your account is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to delete account.');

        setRecoveryMode(false);
        await supabase.auth.signOut();
    };

    const resetPasswordForEmail = async (email) => {
        const { error } = await withTimeout(
            supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }),
            AUTH_TIMEOUT_MS,
            'Sending the reset email is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
    };

    const updatePassword = async (newPassword) => {
        const { error } = await withTimeout(
            supabase.auth.updateUser({ password: newPassword }),
            AUTH_TIMEOUT_MS,
            'Updating your password is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
        setRecoveryMode(false);
    };

    const updateName = async (name) => {
        const { data, error } = await supabase.auth.updateUser({ data: { name } });
        if (error) throw error;
        if (data?.user) setUser(data.user);
        await supabase.from('profiles').update({ name }).eq('id', data.user.id);
    };

    return (
        <AuthContext.Provider value={{
            user, session, loading,
            signInWithEmail, signUp,
            verifySignUpOtp, resendSignUpOtp,
            signInWithGoogle, signOut, deleteAccount,
            recoveryMode, resetPasswordForEmail, updatePassword, updateName,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
