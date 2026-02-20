'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { getFeeEvent } from '../../actions/fee-events';
import { getPaymentsByFeeEvent, createPaymentsForEvent, updatePaymentStatus } from '../../actions/payments';
import type { FeeEvent, Payment, Member } from '@/types/database';

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function formatCurrency(amount: number): string {
    return `¥${amount.toLocaleString()}`;
}

export default function FeeEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [event, setEvent] = useState<FeeEvent | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [showPayModal, setShowPayModal] = useState<Payment | null>(null);
    const [payForm, setPayForm] = useState({ method: 'cash', paid_at: '', note: '' });

    const loadData = useCallback(async () => {
        try {
            const [ev, pays] = await Promise.all([
                getFeeEvent(resolvedParams.id),
                getPaymentsByFeeEvent(resolvedParams.id),
            ]);
            setEvent(ev);
            setPayments(pays);
        } catch (err) {
            console.error('データ取得エラー:', err);
        } finally {
            setLoading(false);
        }
    }, [resolvedParams.id]);

    useEffect(() => { loadData(); }, [loadData]);

    // 支払いレコードの一括生成
    const handleGeneratePayments = async () => {
        try {
            await createPaymentsForEvent(resolvedParams.id);
            loadData();
        } catch (err) {
            console.error('一括生成エラー:', err);
            alert('支払いレコードの生成に失敗しました');
        }
    };

    // 支払い済みにする
    const openPayModal = (payment: Payment) => {
        setShowPayModal(payment);
        setPayForm({
            method: 'cash',
            paid_at: new Date().toISOString().split('T')[0],
            note: payment.note || '',
        });
    };

    const handleMarkPaid = async () => {
        if (!showPayModal) return;
        setUpdatingId(showPayModal.id);
        try {
            await updatePaymentStatus(showPayModal.id, {
                status: 'paid',
                paid_at: payForm.paid_at,
                method: payForm.method as 'cash' | 'transfer' | 'other',
                note: payForm.note,
            });
            setShowPayModal(null);
            loadData();
        } catch (err) {
            console.error('更新エラー:', err);
            alert('更新に失敗しました');
        } finally {
            setUpdatingId(null);
        }
    };

    // 未払いに戻す
    const handleMarkUnpaid = async (payment: Payment) => {
        setUpdatingId(payment.id);
        try {
            await updatePaymentStatus(payment.id, { status: 'unpaid' });
            loadData();
        } catch (err) {
            console.error('更新エラー:', err);
            alert('更新に失敗しました');
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">⏳</div>
                <div className="empty-state-text">読み込み中...</div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">❌</div>
                <div className="empty-state-text">徴収イベントが見つかりません</div>
                <Link href="/fee-events" className="btn btn-secondary mt-4">← 一覧に戻る</Link>
            </div>
        );
    }

    const paidCount = payments.filter(p => p.status === 'paid').length;
    const totalCollected = paidCount * event.amount;
    const totalExpected = payments.length * event.amount;

    return (
        <>
            <div className="detail-header">
                <Link href="/fee-events" className="back-btn">← 徴収イベント一覧</Link>
            </div>

            <div className="page-header">
                <div>
                    <h1 className="page-title">{event.title}</h1>
                    <p className="page-subtitle">{event.note}</p>
                </div>
            </div>

            {/* サマリーカード */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">💰</div>
                    <div className="stat-info">
                        <div className="stat-label">徴収金額</div>
                        <div className="stat-value">{formatCurrency(event.amount)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-info">
                        <div className="stat-label">支払い済み</div>
                        <div className="stat-value">{paidCount}<span style={{ fontSize: '1rem', fontWeight: 400 }}> / {payments.length}人</span></div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon amber">📅</div>
                    <div className="stat-info">
                        <div className="stat-label">徴収期限</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatDate(event.due_date)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon rose">📊</div>
                    <div className="stat-info">
                        <div className="stat-label">徴収額</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                            {formatCurrency(totalCollected)} / {formatCurrency(totalExpected)}
                        </div>
                    </div>
                </div>
            </div>

            {/* 徴収率プログレスバー */}
            <div className="card mb-4">
                <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span className="text-sm font-semibold">徴収率</span>
                        <span className="text-sm font-semibold">
                            {payments.length > 0 ? Math.round((paidCount / payments.length) * 100) : 0}%
                        </span>
                    </div>
                    <div className="progress-bar-wrapper">
                        <div
                            className="progress-bar"
                            style={{
                                width: `${payments.length > 0 ? Math.round((paidCount / payments.length) * 100) : 0}%`
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* 支払い状況テーブル */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">部員ごとの支払い状況</h2>
                    <button className="btn btn-secondary btn-sm" onClick={handleGeneratePayments}>
                        🔄 部員を追加反映
                    </button>
                </div>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>部員名</th>
                                <th>状態</th>
                                <th>支払い日</th>
                                <th>支払い方法</th>
                                <th>メモ</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty-state">
                                            <div className="empty-state-text">支払いレコードがありません</div>
                                            <button className="btn btn-primary mt-4" onClick={handleGeneratePayments}>
                                                支払いレコードを生成
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                payments.map(payment => {
                                    const member = payment.member as unknown as Member | undefined;
                                    return (
                                        <tr key={payment.id}>
                                            <td>
                                                <Link
                                                    href={`/members/${payment.member_id}`}
                                                    style={{ color: 'var(--primary-600)', fontWeight: 500 }}
                                                >
                                                    {member?.name || '不明'}
                                                </Link>
                                            </td>
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
                                            <td className="text-muted text-sm">{payment.note || '-'}</td>
                                            <td>
                                                {payment.status === 'unpaid' ? (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => openPayModal(payment)}
                                                        disabled={updatingId === payment.id}
                                                    >
                                                        支払済にする
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => handleMarkUnpaid(payment)}
                                                        disabled={updatingId === payment.id}
                                                    >
                                                        未払いに戻す
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 支払い登録モーダル */}
            {showPayModal && (
                <div className="modal-overlay" onClick={() => setShowPayModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">支払いを記録</h3>
                            <button className="modal-close" onClick={() => setShowPayModal(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">支払い方法</label>
                                <select
                                    className="form-select"
                                    value={payForm.method}
                                    onChange={e => setPayForm({ ...payForm, method: e.target.value })}
                                >
                                    <option value="cash">現金</option>
                                    <option value="transfer">振込</option>
                                    <option value="other">その他</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">支払い日</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    value={payForm.paid_at}
                                    onChange={e => setPayForm({ ...payForm, paid_at: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">メモ</label>
                                <textarea
                                    className="form-textarea"
                                    value={payForm.note}
                                    onChange={e => setPayForm({ ...payForm, note: e.target.value })}
                                    placeholder="備考"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowPayModal(null)}>キャンセル</button>
                            <button className="btn btn-primary" onClick={handleMarkPaid}>記録する</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
