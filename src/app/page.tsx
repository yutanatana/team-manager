'use client';

import { useState, useEffect } from 'react';
import { getMembers } from './actions/members';
import { getFeeEvents } from './actions/fee-events';
import { getAllPayments } from './actions/payments';
import { getExpenses } from './actions/expenses';
import type { Member, FeeEvent, Payment, Expense } from '@/types/database';

// 金額のフォーマット
function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

// 日付のフォーマット
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [feeEvents, setFeeEvents] = useState<FeeEvent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [m, fe, p, e] = await Promise.all([
          getMembers(),
          getFeeEvents(),
          getAllPayments(),
          getExpenses(),
        ]);
        setMembers(m);
        setFeeEvents(fe);
        setPayments(p);
        setExpenses(e);
      } catch (err) {
        console.error('データ読み込みエラー:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 在籍中の部員数
  const activeMembers = members.filter(m => m.status === 'active');

  // 収入合計（支払い済みの金額合計）
  const totalIncome = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => {
      const event = feeEvents.find(fe => fe.id === p.fee_event_id);
      return sum + (event?.amount || 0);
    }, 0);

  // 支出合計
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  // 現在残高
  const balance = totalIncome - totalExpense;

  // 未払い件数
  const unpaidCount = payments.filter(p => p.status === 'unpaid').length;

  // 直近の収支アクティビティ（合わせて新しい順にソート）
  type Activity = {
    type: 'income' | 'expense';
    title: string;
    date: string;
    amount: number;
  };

  const recentActivities: Activity[] = [
    ...payments
      .filter(p => p.status === 'paid' && p.paid_at)
      .map(p => {
        const event = feeEvents.find(fe => fe.id === p.fee_event_id);
        const member = members.find(m => m.id === p.member_id);
        return {
          type: 'income' as const,
          title: `${member?.name || '不明'} - ${event?.title || '不明'}`,
          date: p.paid_at!,
          amount: event?.amount || 0,
        };
      }),
    ...expenses.map(e => ({
      type: 'expense' as const,
      title: `${e.category}: ${e.note || '詳細なし'}`,
      date: e.date,
      amount: e.amount,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

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
          <h1 className="page-title">ダッシュボード</h1>
          <p className="page-subtitle">チームの収支状況をひと目で確認</p>
        </div>
      </div>

      {/* ステータスカード */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue">💰</div>
          <div className="stat-info">
            <div className="stat-label">現在残高</div>
            <div className={`stat-value ${balance >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(balance)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">📥</div>
          <div className="stat-info">
            <div className="stat-label">収入合計</div>
            <div className="stat-value">{formatCurrency(totalIncome)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon rose">📤</div>
          <div className="stat-info">
            <div className="stat-label">支出合計</div>
            <div className="stat-value">{formatCurrency(totalExpense)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">⚠️</div>
          <div className="stat-info">
            <div className="stat-label">未払い件数</div>
            <div className="stat-value">{unpaidCount}<span style={{ fontSize: '1rem', fontWeight: 400, marginLeft: 4 }}>件</span></div>
          </div>
        </div>
      </div>

      {/* 下部グリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* 直近の収支 */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">直近の収支</h2>
          </div>
          <div className="card-body" style={{ padding: '8px 24px' }}>
            {recentActivities.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-text">まだ収支記録がありません</div>
              </div>
            ) : (
              <div className="activity-list">
                {recentActivities.map((activity, idx) => (
                  <div key={idx} className="activity-item">
                    <div
                      className="activity-icon"
                      style={{
                        background: activity.type === 'income'
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(244, 63, 94, 0.1)',
                      }}
                    >
                      {activity.type === 'income' ? '📥' : '📤'}
                    </div>
                    <div className="activity-info">
                      <div className="activity-title">{activity.title}</div>
                      <div className="activity-meta">{formatDate(activity.date)}</div>
                    </div>
                    <div
                      className="activity-amount"
                      style={{
                        color: activity.type === 'income'
                          ? 'var(--accent-emerald)'
                          : 'var(--accent-rose)',
                      }}
                    >
                      {activity.type === 'income' ? '+' : '-'}
                      {formatCurrency(activity.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* チーム概要 */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">チーム概要</h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div className="stat-label">在籍部員数</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4 }}>
                  {activeMembers.length}<span style={{ fontSize: '0.875rem', fontWeight: 400, marginLeft: 4 }}>人</span>
                </div>
              </div>
              <div>
                <div className="stat-label">徴収イベント数</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4 }}>
                  {feeEvents.length}<span style={{ fontSize: '0.875rem', fontWeight: 400, marginLeft: 4 }}>件</span>
                </div>
              </div>
              <div>
                <div className="stat-label">徴収率</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <div className="progress-bar-wrapper" style={{ flex: 1 }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${payments.length > 0
                          ? Math.round((payments.filter(p => p.status === 'paid').length / payments.length) * 100)
                          : 0}%`
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {payments.length > 0
                      ? Math.round((payments.filter(p => p.status === 'paid').length / payments.length) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
