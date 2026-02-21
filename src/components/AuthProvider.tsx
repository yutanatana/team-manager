'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { Profile } from '@/types/database';

// 認証コンテキストの型
interface AuthContextType {
    profile: Profile | null;
    isAdmin: boolean;
    loading: boolean;
    teamId: string | null;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    profile: null,
    isAdmin: false,
    loading: true,
    teamId: null,
    refreshProfile: async () => { },
});

// 認証コンテキストプロバイダー
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setProfile(null);
            setLoading(false);
            return;
        }

        const { data } = await supabase
            .from('profiles')
            .select('*, team:teams(*)')
            .eq('id', user.id)
            .single();

        setProfile(data ?? null);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchProfile();

        // 認証状態の変化を監視（ログイン/ログアウト時に再取得）
        const supabase = createClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchProfile();
        });

        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    return (
        <AuthContext.Provider value={{
            profile,
            isAdmin: profile?.role === 'admin',
            loading,
            teamId: profile?.team_id ?? null,
            refreshProfile: fetchProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// 認証コンテキストのカスタムフック
export function useAuth() {
    return useContext(AuthContext);
}
