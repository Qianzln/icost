-- 小家账本 Supabase 补充 SQL
-- 在执行完 supabase-schema.sql 后，再执行此文件

-- 1. 给 ledgers 表加 invite_code 字段
alter table ledgers add column if not exists invite_code text unique;

-- 2. 创建账本时自动播种默认分类的函数
create or replace function seed_default_categories(p_ledger_id uuid)
returns void as $$
begin
  insert into categories (ledger_id, name, type, icon, color, sort_order, is_system) values
    (p_ledger_id, '餐饮', 'expense', '🍜', '#FF6B35', 1, true),
    (p_ledger_id, '购物', 'expense', '🛍️', '#FF85A1', 2, true),
    (p_ledger_id, '服饰', 'expense', '👔', '#7EB8DA', 3, true),
    (p_ledger_id, '日用', 'expense', '🧴', '#4ECDC4', 4, true),
    (p_ledger_id, '数码', 'expense', '📱', '#555555', 5, true),
    (p_ledger_id, '住房', 'expense', '🏠', '#3A9CFF', 6, true),
    (p_ledger_id, '交通', 'expense', '🚗', '#35C77B', 7, true),
    (p_ledger_id, '娱乐', 'expense', '🎮', '#9B59B6', 8, true),
    (p_ledger_id, '医疗', 'expense', '🏥', '#E74C3C', 9, true),
    (p_ledger_id, '通讯', 'expense', '📞', '#3498DB', 10, true),
    (p_ledger_id, '学习', 'expense', '📚', '#2C3E80', 11, true),
    (p_ledger_id, '旅行', 'expense', '✈️', '#00BCD4', 12, true),
    (p_ledger_id, '礼物', 'expense', '🎁', '#FFD700', 13, true),
    (p_ledger_id, '宠物', 'expense', '🐾', '#8B6914', 14, true),
    (p_ledger_id, '宝宝', 'expense', '👶', '#FFEB3B', 15, true),
    (p_ledger_id, '美妆', 'expense', '💄', '#E91E63', 16, true),
    (p_ledger_id, '护肤', 'expense', '🧖', '#F8BBD0', 17, true),
    (p_ledger_id, '汽车', 'expense', '🚙', '#607D8B', 18, true),
    (p_ledger_id, '家庭', 'expense', '👨‍👩‍👧', '#FF9800', 19, true),
    (p_ledger_id, '其他', 'expense', '📌', '#9E9E9E', 20, true),
    (p_ledger_id, '工资', 'income', '💰', '#35C77B', 1, true),
    (p_ledger_id, '奖金', 'income', '🏆', '#FFD700', 2, true),
    (p_ledger_id, '兼职', 'income', '💼', '#3A9CFF', 3, true),
    (p_ledger_id, '理财', 'income', '📈', '#4CAF50', 4, true),
    (p_ledger_id, '红包', 'income', '🧧', '#F45D55', 5, true),
    (p_ledger_id, '其他收入', 'income', '💵', '#9E9E9E', 6, true);
end;
$$ language plpgsql security definer;

-- 3. 开启 Realtime（让多人同步生效）
alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table settlements;
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table accounts;
alter publication supabase_realtime add table tags;
