'use client';

import { useState, useEffect, useCallback } from 'react';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../actions/expenses';
import type { Expense } from '@/types/database';

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function formatCurrency(amount: number): string {
    return `¥${amount.toLocaleString()}`;
}

// カテゴリの選択肢
const CATEGORIES = [
    '練習場代',
    '遠征費',
    '備品購入',
    '懇親会',
    '大会参加費',
    '交通費',
    'その他',
];

type ExpenseFormData = {
    date: string;
    amount: string;
    category: string;
    note: string;
    registered_by: string;
};

const emptyForm: ExpenseFormData = {
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: CATEGORIES[0],
    note: '',
    registered_by: '',
};

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ExpenseFormData>(emptyForm);
    const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
    const [filterCategory, setFilterCategory] = useState<string>('all');

    const loadExpenses = useCallback(async () => {
        try {
            const data = await getExpenses();
            setExpenses(data);
        } catch (err) {
            console.error('取得エラー:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadExpenses(); }, [loadExpenses]);

    const filteredExpenses = expenses.filter(e => {
        if (filterCategory === 'all') return true;
        return e.category === filterCategory;
    });

    const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setShowModal(true);
    };

    const openEdit = (expense: Expense) => {
        setEditingId(expense.id);
        setForm({
            date: expense.date,
            amount: String(expense.amount),
            category: expense.category,
            note: expense.note,
            registered_by: expense.registered_by,
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
                await updateExpense(editingId, {
                    date: form.date,
                    amount,
                    category: form.category,
                    note: form.note,
                    registered_by: form.registered_by,
                });
            } else {
                await createExpense({
                    date: form.date,
                    amount,
                    category: form.category,
                    note: form.note,
                    registered_by: form.registered_by,
                });
            }
            setShowModal(false);
            loadExpenses();
        } catch (err) {
            console.error('保存エラー:', err);
            alert('保存に失敗しました');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteExpense(deleteTarget.id);
            setDeleteTarget(null);
            loadExpenses();
        } catch (err) {
            console.error('削除エラー:', err);
            alert('削除に失敗しました');
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

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">支出管理</h1>
                    <p className="page-subtitle">チームの支出を記録・管理</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    ＋ 支出を登録
                </button>
            </div>

            {/* フィルター・合計 */}
            <div className="filter-bar">
                <select
                    className="form-select"
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                >
                    <option value="all">すべてのカテゴリ</option>
                    {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <span className="text-muted text-sm">{filteredExpenses.length}件</span>
                <span style={{ marginLeft: 'auto', fontWeight: 600, fontSize: '0.9375rem' }}>
                    合計: {formatCurrency(totalAmount)}
                </span>
            </div>

            {/* テーブル */}
            <div className="card">
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>日付</th>
                                <th>金額</th>
                                <th>カテゴリ</th>
                                <th>メモ</th>
                                <th>登録者</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty-state">
                                            <div className="empty-state-icon">📝</div>
                                            <div className="empty-state-text">支出が登録されていません</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredExpenses.map(expense => (
                                    <tr key={expense.id}>
                                        <td>{formatDate(expense.date)}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-rose)' }}>
                                            {formatCurrency(expense.amount)}
                                        </td>
                                        <td>
                                            <span className="badge badge-blue">{expense.category}</span>
                                        </td>
                                        <td className="text-muted">{expense.note || '-'}</td>
                                        <td className="text-muted">{expense.registered_by || '-'}</td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(expense)}>✏️</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(expense)}>🗑️</button>
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
                            <h3 className="modal-title">{editingId ? '支出を編集' : '支出を登録'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">日付 *</label>
                                    <input
                                        className="form-input"
                                        type="date"
                                        value={form.date}
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">金額（円）*</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                        placeholder="5000"
                                        min="0"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">カテゴリ *</label>
                                    <select
                                        className="form-select"
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">登録者</label>
                                    <input
                                        className="form-input"
                                        value={form.registered_by}
                                        onChange={e => setForm({ ...form, registered_by: e.target.value })}
                                        placeholder="管理者名"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">メモ</label>
                                <textarea
                                    className="form-textarea"
                                    value={form.note}
                                    onChange={e => setForm({ ...form, note: e.target.value })}
                                    placeholder="用途の詳細"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>キャンセル</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={!form.date || !form.amount}
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
                            <h3 className="modal-title">支出の削除</h3>
                            <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="confirm-dialog">
                                <p>この支出（{formatCurrency(deleteTarget.amount)} - {deleteTarget.category}）を削除しますか？</p>
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
