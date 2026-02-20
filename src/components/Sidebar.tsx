'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

// ナビゲーションリンク定義
const navLinks = [
    { href: '/', label: 'ダッシュボード', icon: '📊' },
    { href: '/members', label: '部員管理', icon: '👥' },
    { href: '/fee-events', label: '部費徴収', icon: '💰' },
    { href: '/expenses', label: '支出管理', icon: '📝' },
    { href: '/reports', label: 'レポート', icon: '📈' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    // 現在のパスがリンクにマッチするか判定
    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* モバイルヘッダー */}
            <div className="mobile-header">
                <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
                    ☰
                </button>
                <span className="mobile-title">部費管理</span>
            </div>

            {/* モバイルオーバーレイ */}
            <div
                className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`}
                onClick={() => setMobileOpen(false)}
            />

            {/* サイドバー */}
            <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">💴</div>
                        <div>
                            <div>部費管理</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 400 }}>
                                Team Fee Manager
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`sidebar-link ${isActive(link.href) ? 'active' : ''}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            <span className="sidebar-link-icon">{link.icon}</span>
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </aside>
        </>
    );
}
