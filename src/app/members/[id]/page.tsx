'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { getMember } from '../../actions/members';
import { getPaymentsByMember } from '../../actions/payments';
import type { Member, Payment } from '@/types/database';

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function formatCurrency(amount: number): string {
    return `¥${amount.toLocaleString()}`;
}

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [member, setMember] = useState<Member | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [m, p] = await Promise.all([
                getMember(resolvedParams.id),
                getPaymentsByMember(resolvedParams.id),
            ]);
            setMember(m);
            setPayments(p);
        } catch (err) {
            console.error('データ取得エラー:', err);
        } finally {
            setLoading(false);
        }
    }, [resolvedParams.id]);

    useEffect(() => { loadData(); }, [loadData]);

    if (loading) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">⏳</div>
                <div className="empty-state-text">読み込み中...</div>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">❌</div>
                <div className="empty-state-text">部員が見つかりません</div>
                <Link href="/members" className="btn btn-secondary mt-4">← 部員一覧に戻る</Link>
            </div>
        );
    }

    // 支払い済み件数
    const paidCount = payments.filter(p => p.status === 'paid').length;

    return (
        <>
            <div className="detail-header">
                <Link href="/members" className="back-btn">← 部員一覧</Link>
            </div>

            <div className="page-header">
                <div>
                    <h1 className="page-title">{member.name}</h1>
                    <p className="page-subtitle">{member.furigana}</p>
                </div>
                <span className={`badge ${member.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                    {member.status === 'active' ? '在籍' : '退部'}
                </span>
            </div>

            {/* プロフィールカード */}
            <div className="card mb-4">
                <div className="card-header">
                    <h2 className="card-title">プロフィール</h2>
                </div>
                <div className="card-body">
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">ポジション</span>
                            <span className="info-value">{member.position || '-'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">連絡先</span>
                            <span className="info-value">{member.contact || '-'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">住所</span>
                            <span className="info-value">{member.address || '-'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">登録日</span>
                            <span className="info-value">{formatDate(member.created_at)}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">支払い率</span>
                            <span className="info-value">
                                {payments.length > 0
                                    ? `${paidCount} / ${payments.length} (${Math.round((paidCount / payments.length) * 100)}%)`
                                    : '支払い記録なし'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 支払い履歴 */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">支払い履歴</h2>
                </div>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>徴収イベント</th>
                                <th>金額</th>
                                <th>状態</th>
                                <th>支払い日</th>
                                <th>支払い方法</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <div className="empty-state">
                                            <div className="empty-state-text">支払い記録がありません</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                payments.map(payment => {
                                    const feeEvent = payment.fee_event as Payment['fee_event'];
                                    return (
                                        <tr key={payment.id}>
                                            <td>
                                                <Link
                                                    href={`/fee-events/${payment.fee_event_id}`}
                                                    style={{ color: 'var(--primary-600)', fontWeight: 500 }}
                                                >
                                                    {feeEvent?.title || '-'}
                                                </Link>
                                            </td>
                                            <td>{feeEvent ? formatCurrency(feeEvent.amount) : '-'}</td>
                                            <td>
                                                <span className={`badge ${payment.status === 'paid' ? 'badge-green' : 'badge-red'}`}>
                                                    {payment.status === 'paid' ? '支払済' : '未払い'}
                                                </span>
                                            </td>
                                            <td className="text-muted">
                                                {payment.paid_at ? formatDate(payment.paid_at) : '-'}
                                            </td>
                                            <td className="text-muted">
                                                {payment.method === 'cash' ? '現金' :
                                                    payment.method === 'transfer' ? '振込' :
                                                        payment.method === 'other' ? 'その他' : '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
