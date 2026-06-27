// Data types for 小家账本

export interface Profile {
  id: string
  nickname: string
  avatar_url?: string
  phone?: string
  created_at: string
}

export type LedgerType = 'personal' | 'couple' | 'family' | 'roommate' | 'travel' | 'project'

export interface Ledger {
  id: string
  name: string
  type: LedgerType
  currency: string
  cover_icon: string
  owner_id: string
  default_account_id?: string
  default_split_method: SplitMethod
  invite_code?: string
  created_at: string
  updated_at: string
}

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface LedgerMember {
  id: string
  ledger_id: string
  user_id: string
  role: MemberRole
  display_name: string
  avatar_url?: string
  joined_at: string
  status: 'active' | 'inactive'
  // Joined profile info
  profile?: Profile
}

export type CategoryType = 'expense' | 'income' | 'transfer'

export interface Category {
  id: string
  ledger_id: string
  name: string
  parent_id?: string
  type: CategoryType
  icon: string
  color: string
  sort_order: number
  is_system: boolean
}

export type AccountType = 'asset' | 'liability' | 'credit'
export type AccountOwnerType = 'personal' | 'partner' | 'shared'

export interface Account {
  id: string
  ledger_id: string
  name: string
  type: AccountType
  sub_type?: string
  balance: number
  currency: string
  owner_type: AccountOwnerType
  owner_user_id?: string
  is_included_in_net_worth: boolean
}

export type TransactionType = 'expense' | 'income' | 'transfer' | 'reimbursement' | 'borrow_in' | 'borrow_out'
export type TransactionScope = 'personal' | 'shared'
export type PrivacyLevel = 'public' | 'partial' | 'private'

export interface Transaction {
  id: string
  ledger_id: string
  type: TransactionType
  amount: number
  currency: string
  category_id: string
  account_id?: string
  creator_user_id: string
  payer_user_id?: string
  scope: TransactionScope
  occurred_at: string
  note?: string
  tags?: string[]
  image_urls?: string[]
  is_private: boolean
  privacy_level: PrivacyLevel
  is_included_in_budget: boolean
  created_at: string
  updated_at: string
  // Joined data
  category?: Category
  account?: Account
  payer?: LedgerMember
  splits?: Split[]
}

export type SplitMethod = 'equal' | 'ratio' | 'custom' | 'single' | 'none'

export interface SplitItem {
  user_id: string
  should_pay: number
  actual_paid: number
}

export interface Split {
  id: string
  transaction_id: string
  ledger_id: string
  method: SplitMethod
  items: SplitItem[]
}

export type SettlementStatus = 'pending' | 'settled' | 'cancelled'

export interface Settlement {
  id: string
  ledger_id: string
  from_user_id: string
  to_user_id: string
  amount: number
  status: SettlementStatus
  related_transaction_ids: string[]
  created_at: string
  settled_at?: string
  // Joined
  from_user?: LedgerMember
  to_user?: LedgerMember
}

export interface Budget {
  id: string
  ledger_id: string
  name: string
  period: 'monthly' | 'weekly' | 'yearly'
  amount: number
  category_id?: string
  member_user_id?: string
  scope: 'personal' | 'shared' | 'family'
  start_date: string
  end_date: string
  alert_thresholds: number[]
}

export interface Goal {
  id: string
  ledger_id: string
  name: string
  target_amount: number
  current_amount: number
  currency: string
  deadline?: string
  participants: string[]
  status: 'active' | 'completed' | 'paused' | 'cancelled'
}

export interface Tag {
  id: string
  ledger_id: string
  name: string
  color: string
}

// Monthly stats aggregation
export interface MonthlyStats {
  total_expense: number
  total_income: number
  balance: number
  budget_remaining?: number
  shared_expense: number
  personal_expense: number
  category_breakdown: { category_id: string; name: string; icon: string; color: string; amount: number }[]
  member_breakdown: { user_id: string; name: string; paid: number; share: number }[]
}
