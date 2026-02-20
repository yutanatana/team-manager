-- 部費管理アプリ データベーススキーマ
-- Supabase の SQL エディタで実行してください

-- UUID生成用の拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 部員テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  furigana TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 徴収イベントテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS fee_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 支払い記録テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  fee_event_id UUID NOT NULL REFERENCES fee_events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
  paid_at DATE,
  method TEXT CHECK (method IN ('cash', 'transfer', 'other')),
  note TEXT NOT NULL DEFAULT '',
  UNIQUE(member_id, fee_event_id)
);

-- ========================================
-- 支出テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  registered_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- インデックス
-- ========================================
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_fee_event_id ON payments(fee_event_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
