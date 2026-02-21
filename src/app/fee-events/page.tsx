'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getFeeEvents, createFeeEvent, updateFeeEvent, deleteFeeEvent } from '../actions/fee-events';
import { createPaymentsForFeeEvent } from '../actions/payments';
import type { FeeEvent } from '@/types/database';

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function formatCurrency(amount: number): string {
    return `¥${amount.toLocaleString()}`;
}

type FeeEventFormData = {
    title: string;
    amount: string;
    due_date: string;
    note: string;
};

const emptyForm: FeeEventFormData = { title: '', amount: '', due_date: '', note: '' };

export default function FeeEventsPage() {
    const [events, setEvents] = useState<FeeEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FeeEventFormData>(emptyForm);
    const [deleteTarget, setDeleteTarget] = useState<FeeEvent | null>(null);

    const loadEvents = useCallback(async () => {
        try {
            const data = await getFeeEvents();
            setEvents(data);
        } catch (err) {
            console.error('取得エラー:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadEvents(); }, [loadEvents]);

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setShowModal(true);
    };

    const openEdit = (event: FeeEvent) => {
        setEditingId(event.id);
        setForm({
            title: event.title,
            amount: String(event.amount),
            due_date: event.due_date,
            note: event.note,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const amount = parseInt(form.amount, 10);
            if (isNaN(amount) || amount < 0) {
                alert('金額を正しく入力してください');
                return;
            }
            if (editingId) {
                await updateFeeEvent(editingId, {
                    title: form.title,
                    amount,
                    due_date: form.due_date,
                    note: form.note,
                });
            } else {
                const created = await createFeeEvent({
                    title: form.title,
                    amount,
                    due_date: form.due_date,
                    note: form.note,
                });
                // 新規作成時、在籍部員全員の支払いレコードを自動生成
                await createPaymentsForFeeEvent(created.id);
            }
            setShowModal(false);
            loadEvents();
        } catch (err) {
            console.error('保存エラー:', err);
            alert('保存に失敗しました');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteFeeEvent(deleteTarget.id);
            setDeleteTarget(null);
            loadEvents();
        } catch (err) {
            console.error('削除エラー:', err);
            alert('削除に失敗しました');
        }
    };

    // 期限チェック
    const isOverdue = (dueDate: string) => {
        return new Date(dueDate) < new Date(new Date().toISOString().split('T')[0]);
    };

    if (loading) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">⏳</div>
                <div className="empty-state-text">読み込み中...</div>
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">部費徴収</h1>
                    <p className="page-subtitle">徴収イベントの管理と支払い状況の確認</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    ＋ 新規イベント
                </button>
            </div>

            <div className="card">
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>イベント名</th>
                                <th>金額</th>
                                <th>徴収期限</th>
                                <th>状態</th>
                                <th>作成日</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty-state">
                                            <div className="empty-state-icon">💰</div>
                                            <div className="empty-state-text">徴収イベントがありません</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                events.map(event => (
                                    <tr key={event.id}>
                                        <td>
                                            <Link href={`/fee-events/${event.id}`} style={{ color: 'var(--primary-600)', fontWeight: 600 }}>
                                                {event.title}
                                            </Link>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(event.amount)}</td>
                                        <td>
                                            <span style={{ color: isOverdue(event.due_date) ? 'var(--accent-rose)' : 'inherit' }}>
                                                {formatDate(event.due_date)}
                                                {isOverdue(event.due_date) && ' ⚠️'}
                                            </span>
                                        </td>
                                        <td>
                                            {event.note && <span className="text-muted text-sm">{event.note}</span>}
                                        </td>
                                        <td className="text-muted">{formatDate(event.created_at)}</td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(event)}>✏️</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(event)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 登録・編集モーダル */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingId ? '徴収イベントを編集' : '新規徴収イベント'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">タイトル *</label>
                                <input
                                    className="form-input"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="2025年4月分 月会費"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">金額（円）*</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                        placeholder="3000"
                                        min="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">徴収期限 *</label>
                                    <input
                                        className="form-input"
                                        type="date"
                                        value={form.due_date}
                                        onChange={e => setForm({ ...form, due_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">備考</label>
                                <textarea
                                    className="form-textarea"
                                    value={form.note}
                                    onChange={e => setForm({ ...form, note: e.target.value })}
                                    placeholder="自由記述"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>キャンセル</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={!form.title.trim() || !form.amount || !form.due_date}
                            >
                                {editingId ? '更新' : '登録'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 削除確認 */}
            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">徴収イベントの削除</h3>
                            <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="confirm-dialog">
                                <p><strong>{deleteTarget.title}</strong> を削除しますか？<br />紐づく支払い記録もすべて削除されます。</p>
                                <div className="confirm-actions">
                                    <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>キャンセル</button>
                                    <button className="btn btn-danger" onClick={handleDelete}>削除</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
