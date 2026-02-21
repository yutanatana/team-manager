-- 既存の members テーブルに住所カラムを追加するマイグレーション
-- Supabase の SQL エディタで実行してください
ALTER TABLE members ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
