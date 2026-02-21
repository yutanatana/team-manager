-- ==================================================
-- テーブル全削除スクリプト（開発環境リセット用）
-- ⚠️ このスクリプトを実行するとすべてのデータが削除されます
-- ==================================================

-- 依存関係の順番に従って削除（CASCADE で関連するポリシー・インデックスも削除）
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS fee_events CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- トリガーと関数を削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 削除確認
SELECT 'すべてのテーブルを削除しました。次に schema.sql を実行してください。' AS message;
