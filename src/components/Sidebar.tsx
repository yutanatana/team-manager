'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';

// ナビゲーションリンクの定義
const navLinks = [
    { href: '/', label: 'ダッシュボード', icon: '📊' },
    { href: '/members', label: '部員管理', icon: '👥' },
    { href: '/fee-events', label: '部費徴収', icon: '💰' },
    { href: '/expenses', label: '支出管理', icon: '📋' },
    { href: '/reports', label: 'レポート', icon: '📈' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const { profile, isAdmin, loading } = useAuth();

    // ログインページではサイドバーを非表示
    if (pathname === '/login' || pathname === '/signup') return null;

    // ログアウト処理
    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <>
            {/* モバイル用ハンバーガーボタン */}
            <button
                className="mobile-menu-btn"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="メニュー"
            >
                {menuOpen ? '✕' : '☰'}
            </button>

            {/* モバイル用オーバーレイ */}
            {menuOpen && (
                <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />
            )}

            {/* サイドバー本体 */}
            <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
                {/* ロゴ */}
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">💰</div>
                    <div className="sidebar-logo-text">
                        <div className="sidebar-logo-title">
                            {loading ? '読込中...' : (profile?.team?.name ?? '部費管理')}
                        </div>
                        <div className="sidebar-logo-subtitle">Team Fee Manager</div>
                    </div>
                </div>

                {/* ナビゲーションリンク */}
                <nav className="sidebar-nav">
                    {navLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`nav-link ${pathname === link.href ? 'active' : ''}`}
                            onClick={() => setMenuOpen(false)}
                        >
                            <span className="nav-icon">{link.icon}</span>
                            <span>{link.label}</span>
                        </Link>
                    ))}

                    {/* 管理者のみ設定リンクを表示 */}
                    {isAdmin && (
                        <Link
                            href="/settings"
                            className={`nav-link ${pathname === '/settings' ? 'active' : ''}`}
                            onClick={() => setMenuOpen(false)}
                        >
                            <span className="nav-icon">⚙️</span>
                            <span>設定</span>
                        </Link>
                    )}
                </nav>

                {/* ユーザー情報・ログアウト */}
                {!loading && profile && (
                    <div className="sidebar-user">
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{profile.display_name || profile.team?.name}</div>
                            <div className="sidebar-user-role">
                                <span className={`badge ${isAdmin ? 'badge-purple' : 'badge-blue'}`}>
                                    {isAdmin ? '管理者' : '一般部員'}
                                </span>
                            </div>
                        </div>
                        <button
                            className="btn btn-ghost btn-sm sidebar-logout"
                            onClick={handleLogout}
                            title="ログアウト"
                        >
                            🚪
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
}
