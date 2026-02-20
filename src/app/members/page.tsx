'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getMembers, createMember, updateMember, deleteMember } from '../actions/members';
import type { Member } from '@/types/database';

// 金額フォーマット
function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

type MemberFormData = {
    name: string;
    furigana: string;
    position: string;
    contact: string;
    status: string;
};

const emptyForm: MemberFormData = { name: '', furigana: '', position: '', contact: '', status: 'active' };

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<MemberFormData>(emptyForm);
    const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const loadMembers = useCallback(async () => {
        try {
            const data = await getMembers();
            setMembers(data);
        } catch (err) {
            console.error('部員取得エラー:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadMembers(); }, [loadMembers]);

    // フィルタリング
    const filteredMembers = members.filter(m => {
        if (filter === 'all') return true;
        return m.status === filter;
    });

    // モーダル開閉
    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setShowModal(true);
    };

    const openEdit = (member: Member) => {
        setEditingId(member.id);
        setForm({
            name: member.name,
            furigana: member.furigana,
            position: member.position,
            contact: member.contact,
            status: member.status,
        });
        setShowModal(true);
    };

    // 保存
    const handleSave = async () => {
        try {
            if (editingId) {
                await updateMember(editingId, form);
            } else {
                await createMember(form);
            }
            setShowModal(false);
            loadMembers();
        } catch (err) {
            console.error('保存エラー:', err);
            alert('保存に失敗しました');
        }
    };

    // 削除
    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteMember(deleteTarget.id);
            setDeleteTarget(null);
            loadMembers();
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
                    <h1 className="page-title">部員管理</h1>
                    <p className="page-subtitle">部員の登録・編集・削除を管理</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    ＋ 新規登録
                </button>
            </div>

            {/* フィルター */}
            <div className="filter-bar">
                <select
                    className="form-select"
                    value={filter}
                    onChange={e => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
                >
                    <option value="all">すべて</option>
                    <option value="active">在籍中</option>
                    <option value="inactive">退部</option>
                </select>
                <span className="text-muted text-sm">{filteredMembers.length}名</span>
            </div>

            {/* テーブル */}
            <div className="card">
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>名前</th>
                                <th>ふりがな</th>
                                <th>ポジション</th>
                                <th>連絡先</th>
                                <th>在籍状態</th>
                                <th>登録日</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="empty-state">
                                            <div className="empty-state-icon">👥</div>
                                            <div className="empty-state-text">部員が登録されていません</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredMembers.map(member => (
                                    <tr key={member.id}>
                                        <td>
                                            <Link href={`/members/${member.id}`} style={{ color: 'var(--primary-600)', fontWeight: 600 }}>
                                                {member.name}
                                            </Link>
                                        </td>
                                        <td className="text-muted">{member.furigana}</td>
                                        <td>{member.position || '-'}</td>
                                        <td className="text-muted">{member.contact || '-'}</td>
                                        <td>
                                            <span className={`badge ${member.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                                                {member.status === 'active' ? '在籍' : '退部'}
                                            </span>
                                        </td>
                                        <td className="text-muted">{formatDate(member.created_at)}</td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(member)}>✏️</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(member)}>🗑️</button>
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
                            <h3 className="modal-title">{editingId ? '部員情報を編集' : '新規部員登録'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">名前 *</label>
                                <input
                                    className="form-input"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="山田 太郎"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">ふりがな</label>
                                <input
                                    className="form-input"
                                    value={form.furigana}
                                    onChange={e => setForm({ ...form, furigana: e.target.value })}
                                    placeholder="やまだ たろう"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">ポジション</label>
                                    <input
                                        className="form-input"
                                        value={form.position}
                                        onChange={e => setForm({ ...form, position: e.target.value })}
                                        placeholder="FW"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">連絡先</label>
                                    <input
                                        className="form-input"
                                        value={form.contact}
                                        onChange={e => setForm({ ...form, contact: e.target.value })}
                                        placeholder="example@email.com"
                                    />
                                </div>
                            </div>
                            {editingId && (
                                <div className="form-group">
                                    <label className="form-label">在籍状態</label>
                                    <select
                                        className="form-select"
                                        value={form.status}
                                        onChange={e => setForm({ ...form, status: e.target.value })}
                                    >
                                        <option value="active">在籍</option>
                                        <option value="inactive">退部</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>キャンセル</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim()}>
                                {editingId ? '更新' : '登録'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 削除確認ダイアログ */}
            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">部員の削除</h3>
                            <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="confirm-dialog">
                                <p><strong>{deleteTarget.name}</strong> を削除しますか？<br />この操作は取り消せません。</p>
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
