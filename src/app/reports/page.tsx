'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFeeEvents } from '../actions/fee-events';
import { getAllPayments } from '../actions/payments';
import { getExpenses } from '../actions/expenses';
import type { FeeEvent, Payment, Expense } from '@/types/database';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    LineChart, Line, ResponsiveContainer,
} from 'recharts';

function formatCurrency(amount: number): string {
    return `¥${amount.toLocaleString()}`;
}

type MonthlyData = {
    month: string;
    income: number;
    expense: number;
    balance: number;
};

export default function ReportsPage() {
    const [feeEvents, setFeeEvents] = useState<FeeEvent[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

    const loadData = useCallback(async () => {
        try {
            const [fe, p, e] = await Promise.all([
                getFeeEvents(),
                getAllPayments(),
                getExpenses(),
            ]);
            setFeeEvents(fe);
            setPayments(p);
            setExpenses(e);
        } catch (err) {
            console.error('データ取得エラー:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // 月別データを集計
    const getMonthlyData = (): MonthlyData[] => {
        const monthMap = new Map<string, { income: number; expense: number }>();

        // 収入（支払い済みの支払い記録）
        payments.filter(p => p.status === 'paid' && p.paid_at).forEach(p => {
            const month = p.paid_at!.substring(0, 7); // YYYY-MM
            const event = feeEvents.find(fe => fe.id === p.fee_event_id);
            const current = monthMap.get(month) || { income: 0, expense: 0 };
            current.income += event?.amount || 0;
            monthMap.set(month, current);
        });

        // 支出
        expenses.forEach(e => {
            const month = e.date.substring(0, 7);
            const current = monthMap.get(month) || { income: 0, expense: 0 };
            current.expense += e.amount;
            monthMap.set(month, current);
        });

        // ソート
        return Array.from(monthMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({
                month,
                income: data.income,
                expense: data.expense,
                balance: data.income - data.expense,
            }));
    };

    // 年別データを集計
    const getYearlyData = (): MonthlyData[] => {
        const yearMap = new Map<string, { income: number; expense: number }>();

        payments.filter(p => p.status === 'paid' && p.paid_at).forEach(p => {
            const year = p.paid_at!.substring(0, 4);
            const event = feeEvents.find(fe => fe.id === p.fee_event_id);
            const current = yearMap.get(year) || { income: 0, expense: 0 };
            current.income += event?.amount || 0;
            yearMap.set(year, current);
        });

        expenses.forEach(e => {
            const year = e.date.substring(0, 4);
            const current = yearMap.get(year) || { income: 0, expense: 0 };
            current.expense += e.amount;
            yearMap.set(year, current);
        });

        return Array.from(yearMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([year, data]) => ({
                month: year,
                income: data.income,
                expense: data.expense,
                balance: data.income - data.expense,
            }));
    };

    // カテゴリ別支出データ
    const getCategoryData = () => {
        const catMap = new Map<string, number>();
        expenses.forEach(e => {
            catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
        });
        return Array.from(catMap.entries())
            .sort(([, a], [, b]) => b - a)
            .map(([category, amount]) => ({ category, amount }));
    };

    // CSVエクスポート
    const handleExportCSV = () => {
        const data = viewMode === 'monthly' ? getMonthlyData() : getYearlyData();
        const header = viewMode === 'monthly' ? '月,収入,支出,差引' : '年,収入,支出,差引';
        const rows = data.map(d => `${d.month},${d.income},${d.expense},${d.balance}`);
        const csv = '\uFEFF' + [header, ...rows].join('\n'); // BOM付きUTF-8

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `収支レポート_${viewMode === 'monthly' ? '月別' : '年別'}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // 支出CSVエクスポート
    const handleExportExpensesCSV = () => {
        const header = '日付,金額,カテゴリ,メモ,登録者';
        const rows = expenses.map(e => `${e.date},${e.amount},${e.category},"${e.note}",${e.registered_by}`);
        const csv = '\uFEFF' + [header, ...rows].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `支出一覧_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">⏳</div>
                <div className="empty-state-text">読み込み中...</div>
            </div>
        );
    }

    const chartData = viewMode === 'monthly' ? getMonthlyData() : getYearlyData();
    const categoryData = getCategoryData();
    const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
    const totalExpense = chartData.reduce((sum, d) => sum + d.expense, 0);

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">収支レポート</h1>
                    <p className="page-subtitle">チームの収支状況をグラフとデータで確認</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                        📄 収支CSV
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleExportExpensesCSV}>
                        📄 支出CSV
                    </button>
                </div>
            </div>

            {/* サマリー */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon green">📥</div>
                    <div className="stat-info">
                        <div className="stat-label">総収入</div>
                        <div className="stat-value positive">{formatCurrency(totalIncome)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon rose">📤</div>
                    <div className="stat-info">
                        <div className="stat-label">総支出</div>
                        <div className="stat-value negative">{formatCurrency(totalExpense)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue">💰</div>
                    <div className="stat-info">
                        <div className="stat-label">差引残高</div>
                        <div className={`stat-value ${totalIncome - totalExpense >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(totalIncome - totalExpense)}
                        </div>
                    </div>
                </div>
            </div>

            {/* タブ切替 */}
            <div className="tabs">
                <button
                    className={`tab ${viewMode === 'monthly' ? 'active' : ''}`}
                    onClick={() => setViewMode('monthly')}
                >
                    月別
                </button>
                <button
                    className={`tab ${viewMode === 'yearly' ? 'active' : ''}`}
                    onClick={() => setViewMode('yearly')}
                >
                    年別
                </button>
            </div>

            {/* 収支棒グラフ */}
            <div className="card mb-4">
                <div className="card-header">
                    <h2 className="card-title">収支グラフ</h2>
                </div>
                <div className="card-body">
                    {chartData.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-text">データがありません</div>
                        </div>
                    ) : (
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        formatter={(value) => formatCurrency(Number(value))}
                                        labelStyle={{ fontWeight: 600 }}
                                    />
                                    <Legend />
                                    <Bar dataKey="income" name="収入" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expense" name="支出" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* 残高推移 */}
            <div className="card mb-4">
                <div className="card-header">
                    <h2 className="card-title">残高推移</h2>
                </div>
                <div className="card-body">
                    {chartData.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-text">データがありません</div>
                        </div>
                    ) : (
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        formatter={(value) => formatCurrency(Number(value))}
                                        labelStyle={{ fontWeight: 600 }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="balance"
                                        name="差引残高"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        dot={{ r: 5, fill: '#6366f1' }}
                                        activeDot={{ r: 7 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* サマリーテーブルとカテゴリ別 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* サマリーテーブル */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">{viewMode === 'monthly' ? '月別' : '年別'}サマリー</h2>
                    </div>
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{viewMode === 'monthly' ? '月' : '年'}</th>
                                    <th className="text-right">収入</th>
                                    <th className="text-right">支出</th>
                                    <th className="text-right">差引</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chartData.map(d => (
                                    <tr key={d.month}>
                                        <td>{d.month}</td>
                                        <td className="text-right" style={{ color: 'var(--accent-emerald)' }}>
                                            {formatCurrency(d.income)}
                                        </td>
                                        <td className="text-right" style={{ color: 'var(--accent-rose)' }}>
                                            {formatCurrency(d.expense)}
                                        </td>
                                        <td className="text-right font-semibold" style={{
                                            color: d.balance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                                        }}>
                                            {formatCurrency(d.balance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* カテゴリ別支出 */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">カテゴリ別支出</h2>
                    </div>
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>カテゴリ</th>
                                    <th className="text-right">金額</th>
                                    <th className="text-right">割合</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categoryData.length === 0 ? (
                                    <tr>
                                        <td colSpan={3}>
                                            <div className="empty-state">
                                                <div className="empty-state-text">支出データがありません</div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    categoryData.map(d => (
                                        <tr key={d.category}>
                                            <td>
                                                <span className="badge badge-blue">{d.category}</span>
                                            </td>
                                            <td className="text-right font-semibold">{formatCurrency(d.amount)}</td>
                                            <td className="text-right text-muted">
                                                {totalExpense > 0 ? Math.round((d.amount / totalExpense) * 100) : 0}%
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
