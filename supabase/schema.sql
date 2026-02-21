-- ==================================================
-- 部費管理アプリ データベーススキーマ (Phase 2: 認証・マルチテナント対応)
-- ==================================================

-- UUID 拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================
-- teams テーブル（チーム/テナント）
-- ==================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================================================
-- profiles テーブル（auth.users と 1:1 で紐づく）
-- ==================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================================================
-- members テーブル（部員情報）
-- ==================================================
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  furigana TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================================================
-- fee_events テーブル（徴収イベント）
-- ==================================================
CREATE TABLE IF NOT EXISTS fee_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================================================
-- payments テーブル（支払い記録）
-- ==================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  fee_event_id UUID NOT NULL REFERENCES fee_events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
  paid_at TIMESTAMPTZ,
  method TEXT CHECK (method IN ('cash', 'transfer', 'other')),
  note TEXT NOT NULL DEFAULT '',
  UNIQUE (member_id, fee_event_id)
);

-- ==================================================
-- expenses テーブル（支出）
-- ==================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  registered_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================================================
-- インデックス
-- ==================================================
CREATE INDEX IF NOT EXISTS idx_members_team_id ON members(team_id);
CREATE INDEX IF NOT EXISTS idx_fee_events_team_id ON fee_events(team_id);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_fee_event_id ON payments(fee_event_id);
CREATE INDEX IF NOT EXISTS idx_payments_team_id ON payments(team_id);
CREATE INDEX IF NOT EXISTS idx_expenses_team_id ON expenses(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON profiles(team_id);

-- ==================================================
-- Row Level Security (RLS) の有効化
-- ==================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- RLS ポリシー: teams
-- ==================================================
-- 自分が所属するチームのみ参照可能
CREATE POLICY "teams_select" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM profiles WHERE id = auth.uid())
  );

-- 管理者のみチーム名を更新可能
CREATE POLICY "teams_update" ON teams
  FOR UPDATE USING (
    id IN (
      SELECT team_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =================================================
-- RLS ポリシー: profiles
-- ==================================================
-- 同じチームのプロフィールを参照可能
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid())
  );

-- 自分のプロフィールのみ更新可能
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ==================================================
-- RLS ポリシー: members（チーム単位でアクセス制御）
-- ==================================================
CREATE POLICY "members_select" ON members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "members_insert" ON members
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "members_update" ON members
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "members_delete" ON members
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==================================================
-- RLS ポリシー: fee_events
-- ==================================================
CREATE POLICY "fee_events_select" ON fee_events
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "fee_events_insert" ON fee_events
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "fee_events_update" ON fee_events
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "fee_events_delete" ON fee_events
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==================================================
-- RLS ポリシー: payments
-- ==================================================
CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "payments_update" ON payments
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==================================================
-- RLS ポリシー: expenses
-- ==================================================
CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==================================================
-- 新規ユーザー登録時に profiles レコードを自動作成するトリガー
-- （signup 後に別途 team_id と role を設定する）
-- ==================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
