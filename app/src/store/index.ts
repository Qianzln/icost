import { create } from 'zustand'
import type {
  Profile, Ledger, LedgerMember, Category, Account,
  Transaction, Settlement, Tag
} from '../types'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import * as api from '../lib/api'

// ============ Helpers ============

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ============ Mock / Local Data ============

const DEMO_USER: Profile = {
  id: 'user_001',
  nickname: '我',
  avatar_url: '',
  phone: '13800000000',
  created_at: '2026-06-01T00:00:00Z',
}

const DEMO_PARTNER: Profile = {
  id: 'user_002',
  nickname: '对方',
  avatar_url: '',
  phone: '13900000000',
  created_at: '2026-06-01T00:00:00Z',
}

const DEMO_LEDGER: Ledger = {
  id: 'ledger_001',
  name: '我们的小家',
  type: 'couple',
  currency: 'CNY',
  cover_icon: 'home',
  owner_id: 'user_001',
  default_split_method: 'equal',
  invite_code: 'ABC123',
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
}

const DEMO_MEMBERS: LedgerMember[] = [
  { id: 'm1', ledger_id: 'ledger_001', user_id: 'user_001', role: 'owner', display_name: '我', joined_at: '2026-06-01T00:00:00Z', status: 'active', profile: DEMO_USER },
  { id: 'm2', ledger_id: 'ledger_001', user_id: 'user_002', role: 'member', display_name: '对方', joined_at: '2026-06-01T00:00:00Z', status: 'active', profile: DEMO_PARTNER },
]

const DEMO_CATEGORIES: Category[] = [
  { id: 'c01', ledger_id: 'ledger_001', name: '餐饮', type: 'expense', icon: '🍜', color: '#FF6B35', sort_order: 1, is_system: true },
  { id: 'c02', ledger_id: 'ledger_001', name: '购物', type: 'expense', icon: '🛍️', color: '#FF85A1', sort_order: 2, is_system: true },
  { id: 'c03', ledger_id: 'ledger_001', name: '服饰', type: 'expense', icon: '👔', color: '#7EB8DA', sort_order: 3, is_system: true },
  { id: 'c04', ledger_id: 'ledger_001', name: '日用', type: 'expense', icon: '🧴', color: '#4ECDC4', sort_order: 4, is_system: true },
  { id: 'c05', ledger_id: 'ledger_001', name: '数码', type: 'expense', icon: '📱', color: '#555555', sort_order: 5, is_system: true },
  { id: 'c06', ledger_id: 'ledger_001', name: '住房', type: 'expense', icon: '🏠', color: '#3A9CFF', sort_order: 6, is_system: true },
  { id: 'c07', ledger_id: 'ledger_001', name: '交通', type: 'expense', icon: '🚗', color: '#35C77B', sort_order: 7, is_system: true },
  { id: 'c08', ledger_id: 'ledger_001', name: '娱乐', type: 'expense', icon: '🎮', color: '#9B59B6', sort_order: 8, is_system: true },
  { id: 'c09', ledger_id: 'ledger_001', name: '医疗', type: 'expense', icon: '🏥', color: '#E74C3C', sort_order: 9, is_system: true },
  { id: 'c10', ledger_id: 'ledger_001', name: '通讯', type: 'expense', icon: '📞', color: '#3498DB', sort_order: 10, is_system: true },
  { id: 'c11', ledger_id: 'ledger_001', name: '学习', type: 'expense', icon: '📚', color: '#2C3E80', sort_order: 11, is_system: true },
  { id: 'c12', ledger_id: 'ledger_001', name: '旅行', type: 'expense', icon: '✈️', color: '#00BCD4', sort_order: 12, is_system: true },
  { id: 'c13', ledger_id: 'ledger_001', name: '礼物', type: 'expense', icon: '🎁', color: '#FFD700', sort_order: 13, is_system: true },
  { id: 'c14', ledger_id: 'ledger_001', name: '宠物', type: 'expense', icon: '🐾', color: '#8B6914', sort_order: 14, is_system: true },
  { id: 'c15', ledger_id: 'ledger_001', name: '宝宝', type: 'expense', icon: '👶', color: '#FFEB3B', sort_order: 15, is_system: true },
  { id: 'c16', ledger_id: 'ledger_001', name: '美妆', type: 'expense', icon: '💄', color: '#E91E63', sort_order: 16, is_system: true },
  { id: 'c17', ledger_id: 'ledger_001', name: '护肤', type: 'expense', icon: '🧖', color: '#F8BBD0', sort_order: 17, is_system: true },
  { id: 'c18', ledger_id: 'ledger_001', name: '汽车', type: 'expense', icon: '🚙', color: '#607D8B', sort_order: 18, is_system: true },
  { id: 'c19', ledger_id: 'ledger_001', name: '家庭', type: 'expense', icon: '👨‍👩‍👧', color: '#FF9800', sort_order: 19, is_system: true },
  { id: 'c20', ledger_id: 'ledger_001', name: '其他', type: 'expense', icon: '📌', color: '#9E9E9E', sort_order: 20, is_system: true },
  // Income categories
  { id: 'i01', ledger_id: 'ledger_001', name: '工资', type: 'income', icon: '💰', color: '#35C77B', sort_order: 1, is_system: true },
  { id: 'i02', ledger_id: 'ledger_001', name: '奖金', type: 'income', icon: '🏆', color: '#FFD700', sort_order: 2, is_system: true },
  { id: 'i03', ledger_id: 'ledger_001', name: '兼职', type: 'income', icon: '💼', color: '#3A9CFF', sort_order: 3, is_system: true },
  { id: 'i04', ledger_id: 'ledger_001', name: '理财', type: 'income', icon: '📈', color: '#4CAF50', sort_order: 4, is_system: true },
  { id: 'i05', ledger_id: 'ledger_001', name: '红包', type: 'income', icon: '🧧', color: '#F45D55', sort_order: 5, is_system: true },
  { id: 'i06', ledger_id: 'ledger_001', name: '其他收入', type: 'income', icon: '💵', color: '#9E9E9E', sort_order: 6, is_system: true },
  // 餐饮子分类
  { id: 'c01_1', ledger_id: 'ledger_001', name: '三餐', type: 'expense', icon: '🍚', color: '#FF6B35', sort_order: 100, is_system: true, parent_id: 'c01' },
  { id: 'c01_2', ledger_id: 'ledger_001', name: '零食', type: 'expense', icon: '🍪', color: '#FF6B35', sort_order: 101, is_system: true, parent_id: 'c01' },
  { id: 'c01_3', ledger_id: 'ledger_001', name: '水果', type: 'expense', icon: '🍎', color: '#FF6B35', sort_order: 102, is_system: true, parent_id: 'c01' },
  { id: 'c01_4', ledger_id: 'ledger_001', name: '蔬菜', type: 'expense', icon: '🥬', color: '#FF6B35', sort_order: 103, is_system: true, parent_id: 'c01' },
]

const DEMO_ACCOUNTS: Account[] = [
  { id: 'a01', ledger_id: 'ledger_001', name: '微信', type: 'asset', sub_type: 'wechat', balance: 3200, currency: 'CNY', owner_type: 'personal', owner_user_id: 'user_001', is_included_in_net_worth: true },
  { id: 'a02', ledger_id: 'ledger_001', name: '支付宝', type: 'asset', sub_type: 'alipay', balance: 5800, currency: 'CNY', owner_type: 'personal', owner_user_id: 'user_001', is_included_in_net_worth: true },
  { id: 'a03', ledger_id: 'ledger_001', name: '银行卡', type: 'asset', sub_type: 'bank', balance: 28000, currency: 'CNY', owner_type: 'shared', is_included_in_net_worth: true },
  { id: 'a04', ledger_id: 'ledger_001', name: '现金', type: 'asset', sub_type: 'cash', balance: 500, currency: 'CNY', owner_type: 'personal', owner_user_id: 'user_001', is_included_in_net_worth: true },
]

const DEMO_TAGS: Tag[] = [
  { id: 'tag01', ledger_id: 'ledger_001', name: '必要开支', color: '#FF6B35' },
  { id: 'tag02', ledger_id: 'ledger_001', name: '可省则省', color: '#35C77B' },
  { id: 'tag03', ledger_id: 'ledger_001', name: '报销', color: '#3A9CFF' },
]

// Demo transactions for current month
const now = new Date()
const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 't01', ledger_id: 'ledger_001', type: 'expense', amount: 58, currency: 'CNY',
    category_id: 'c01', account_id: 'a01', creator_user_id: 'user_001', payer_user_id: 'user_001',
    scope: 'shared', occurred_at: `${ym}-26T12:30:00Z`, note: '午餐',
    is_private: false, privacy_level: 'public', is_included_in_budget: true,
    created_at: `${ym}-26T12:31:00Z`, updated_at: `${ym}-26T12:31:00Z`,
    category: DEMO_CATEGORIES[0],
    splits: [{ id: 's01', transaction_id: 't01', ledger_id: 'ledger_001', method: 'equal', items: [{ user_id: 'user_001', should_pay: 29, actual_paid: 58 }, { user_id: 'user_002', should_pay: 29, actual_paid: 0 }] }],
  },
  {
    id: 't02', ledger_id: 'ledger_001', type: 'expense', amount: 3000, currency: 'CNY',
    category_id: 'c06', account_id: 'a03', creator_user_id: 'user_002', payer_user_id: 'user_002',
    scope: 'shared', occurred_at: `${ym}-01T09:00:00Z`, note: '房租',
    is_private: false, privacy_level: 'public', is_included_in_budget: true,
    created_at: `${ym}-01T09:01:00Z`, updated_at: `${ym}-01T09:01:00Z`,
    category: DEMO_CATEGORIES[5],
    splits: [{ id: 's02', transaction_id: 't02', ledger_id: 'ledger_001', method: 'equal', items: [{ user_id: 'user_001', should_pay: 1500, actual_paid: 0 }, { user_id: 'user_002', should_pay: 1500, actual_paid: 3000 }] }],
  },
  {
    id: 't03', ledger_id: 'ledger_001', type: 'expense', amount: 156, currency: 'CNY',
    category_id: 'c02', account_id: 'a02', creator_user_id: 'user_001', payer_user_id: 'user_001',
    scope: 'personal', occurred_at: `${ym}-24T19:30:00Z`, note: '买了件T恤',
    is_private: false, privacy_level: 'public', is_included_in_budget: true,
    created_at: `${ym}-24T19:31:00Z`, updated_at: `${ym}-24T19:31:00Z`,
    category: DEMO_CATEGORIES[1],
    splits: [{ id: 's03', transaction_id: 't03', ledger_id: 'ledger_001', method: 'single', items: [{ user_id: 'user_001', should_pay: 156, actual_paid: 156 }] }],
  },
  {
    id: 't04', ledger_id: 'ledger_001', type: 'expense', amount: 280, currency: 'CNY',
    category_id: 'c01', account_id: 'a01', creator_user_id: 'user_001', payer_user_id: 'user_001',
    scope: 'shared', occurred_at: `${ym}-22T20:00:00Z`, note: '周末聚餐',
    is_private: false, privacy_level: 'public', is_included_in_budget: true,
    created_at: `${ym}-22T20:01:00Z`, updated_at: `${ym}-22T20:01:00Z`,
    category: DEMO_CATEGORIES[0],
    splits: [{ id: 's04', transaction_id: 't04', ledger_id: 'ledger_001', method: 'equal', items: [{ user_id: 'user_001', should_pay: 140, actual_paid: 280 }, { user_id: 'user_002', should_pay: 140, actual_paid: 0 }] }],
  },
  {
    id: 't05', ledger_id: 'ledger_001', type: 'income', amount: 15000, currency: 'CNY',
    category_id: 'i01', account_id: 'a03', creator_user_id: 'user_001', payer_user_id: 'user_001',
    scope: 'personal', occurred_at: `${ym}-10T00:00:00Z`, note: '6月工资',
    is_private: false, privacy_level: 'public', is_included_in_budget: true,
    created_at: `${ym}-10T00:01:00Z`, updated_at: `${ym}-10T00:01:00Z`,
    category: DEMO_CATEGORIES.find(c => c.id === 'i01'),
  },
  {
    id: 't06', ledger_id: 'ledger_001', type: 'expense', amount: 35, currency: 'CNY',
    category_id: 'c07', account_id: 'a01', creator_user_id: 'user_002', payer_user_id: 'user_002',
    scope: 'shared', occurred_at: `${ym}-25T08:30:00Z`, note: '打车',
    is_private: false, privacy_level: 'public', is_included_in_budget: true,
    created_at: `${ym}-25T08:31:00Z`, updated_at: `${ym}-25T08:31:00Z`,
    category: DEMO_CATEGORIES[6],
    splits: [{ id: 's06', transaction_id: 't06', ledger_id: 'ledger_001', method: 'equal', items: [{ user_id: 'user_001', should_pay: 17.5, actual_paid: 0 }, { user_id: 'user_002', should_pay: 17.5, actual_paid: 35 }] }],
  },
]

const DEMO_SETTLEMENTS: Settlement[] = [
  {
    id: 'set01', ledger_id: 'ledger_001', from_user_id: 'user_002', to_user_id: 'user_001',
    amount: 140, status: 'pending', related_transaction_ids: ['t01', 't04'],
    created_at: `${ym}-26T12:31:00Z`,
    from_user: DEMO_MEMBERS[1], to_user: DEMO_MEMBERS[0],
  },
]


// ============ Store ============

interface AppState {
  // Auth
  isAuthenticated: boolean
  isLoading: boolean
  currentUser: Profile | null
  isRemote: boolean  // true when Supabase is active
  initAuth: () => Promise<void>
  loginRemote: (email: string, password: string) => Promise<void>
  registerRemote: (email: string, password: string, nickname: string) => Promise<void>
  login: (user: Profile) => void
  logout: () => Promise<void>
  updateNickname: (nickname: string) => Promise<void>

  // Ledger
  currentLedger: Ledger | null
  ledgers: Ledger[]
  setLedger: (ledger: Ledger) => void
  createLedger: (name: string, type: Ledger['type']) => Promise<Ledger>
  joinLedgerByCode: (code: string) => Promise<boolean>
  loadLedgerData: (ledgerId: string) => Promise<void>

  // Members
  members: LedgerMember[]
  setMembers: (members: LedgerMember[]) => void

  // Categories
  categories: Category[]
  setCategories: (categories: Category[]) => void

  // Accounts
  accounts: Account[]
  setAccounts: (accounts: Account[]) => void

  // Transactions
  transactions: Transaction[]
  setTransactions: (transactions: Transaction[]) => void
  addTransaction: (transaction: Transaction) => Promise<void>
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  deleteTransaction: (id: string) => Promise<void>
  clearTransactions: () => Promise<void>
  deleteTransactionsByFilter: (filter: { categoryIds?: string[]; before?: string; after?: string }) => number

  // Settlements
  settlements: Settlement[]
  setSettlements: (settlements: Settlement[]) => void
  markSettled: (id: string) => Promise<void>

  // Tags
  tags: Tag[]
  setTags: (tags: Tag[]) => void
  addTag: (name: string, color: string) => Promise<void>
  deleteTag: (id: string) => Promise<void>

  // Budget
  monthlyBudget: number
  setMonthlyBudget: (amount: number) => void

  // Data management
  resetLedger: () => Promise<void>

  // Realtime
  startRealtime: () => void
  stopRealtime: () => void

  // UI
  showAddTransaction: boolean
  setShowAddTransaction: (show: boolean) => void
}

let realtimeCleanup: (() => void) | null = null

export const useStore = create<AppState>((set, get) => ({
  // Auth
  isAuthenticated: !isSupabaseConfigured,  // auto-auth in demo mode
  isLoading: isSupabaseConfigured,
  currentUser: isSupabaseConfigured ? null : DEMO_USER,
  isRemote: isSupabaseConfigured,

  initAuth: async () => {
    if (!isSupabaseConfigured) {
      set({ isLoading: false })
      return
    }
    try {
      const session = await api.getSession()
      if (session?.user) {
        const profile = await api.getProfile(session.user.id)
        const user: Profile = profile || {
          id: session.user.id,
          nickname: session.user.email?.split('@')[0] || '用户',
          created_at: new Date().toISOString(),
        }
        const ledgers = await api.fetchUserLedgers(user.id)
        const currentLedger = ledgers[0] || null

        set({
          isAuthenticated: true,
          isLoading: false,
          currentUser: user,
          ledgers,
          currentLedger,
        })

        if (currentLedger) {
          await get().loadLedgerData(currentLedger.id)
          get().startRealtime()
        }
      } else {
        set({ isLoading: false })
      }
    } catch (e) {
      console.error('initAuth error:', e)
      set({ isLoading: false })
    }
  },

  loginRemote: async (email, password) => {
    const { data } = await api.signIn(email, password)
    if (data.user) {
      const profile = await api.getProfile(data.user.id)
      const user: Profile = profile || {
        id: data.user!.id,
        nickname: email.split('@')[0],
        created_at: new Date().toISOString(),
      }
      const ledgers = await api.fetchUserLedgers(user.id)
      let currentLedger = ledgers[0] || null

      // If no ledger exists, create a default one
      if (!currentLedger) {
        currentLedger = await api.createLedger('我的账本', 'personal', user.id)
        ledgers.push(currentLedger)
      }

      set({
        isAuthenticated: true,
        currentUser: user,
        ledgers,
        currentLedger,
      })

      await get().loadLedgerData(currentLedger.id)
      get().startRealtime()
    }
  },

  registerRemote: async (email, password, nickname) => {
    await api.signUp(email, password, nickname)
    // Auto-login after registration
    await get().loginRemote(email, password)
  },

  login: (user) => set({ isAuthenticated: true, currentUser: user }),
  logout: async () => {
    get().stopRealtime()
    if (isSupabaseConfigured) {
      await api.signOut()
    }
    set({
      isAuthenticated: false,
      currentUser: null,
      currentLedger: null,
      ledgers: [],
      transactions: [],
      categories: [],
      accounts: [],
      settlements: [],
      tags: [],
      members: [],
    })
  },
  updateNickname: async (nickname) => {
    const state = get()
    const updatedUser = state.currentUser ? { ...state.currentUser, nickname } : null
    const updatedMembers = state.members.map(m =>
      m.user_id === state.currentUser?.id ? { ...m, display_name: nickname } : m
    )
    set({ currentUser: updatedUser, members: updatedMembers })
    if (isSupabaseConfigured && state.currentUser) {
      await api.updateProfile(state.currentUser.id, { nickname })
    }
  },

  // Ledger
  currentLedger: isSupabaseConfigured ? null : DEMO_LEDGER,
  ledgers: isSupabaseConfigured ? [] : [DEMO_LEDGER],
  setLedger: async (ledger) => {
    set({ currentLedger: ledger })
    if (isSupabaseConfigured) {
      get().stopRealtime()
      await get().loadLedgerData(ledger.id)
      get().startRealtime()
    }
  },
  createLedger: async (name, type) => {
    const state = get()
    if (isSupabaseConfigured && state.currentUser) {
      const ledger = await api.createLedger(name, type, state.currentUser.id)
      const ledgers = [...state.ledgers, ledger]
      set({ ledgers, currentLedger: ledger })
      await get().loadLedgerData(ledger.id)
      return ledger
    }
    // Demo mode
    const newLedger: Ledger = {
      id: `ledger_${generateId()}`,
      name, type, currency: 'CNY', cover_icon: 'home',
      owner_id: state.currentUser?.id ?? '',
      default_split_method: 'equal',
      invite_code: generateInviteCode(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    set((s) => ({
      ledgers: [...s.ledgers, newLedger],
      currentLedger: newLedger,
    }))
    return newLedger
  },
  joinLedgerByCode: async (code) => {
    const state = get()
    if (isSupabaseConfigured && state.currentUser) {
      const ledger = await api.joinLedgerByCode(code, state.currentUser.id)
      if (ledger) {
        const ledgers = [...state.ledgers, ledger]
        set({ ledgers, currentLedger: ledger })
        await get().loadLedgerData(ledger.id)
        return true
      }
      return false
    }
    // Demo mode
    const ledger = state.ledgers.find(l => l.invite_code === code.toUpperCase())
    if (ledger) {
      set({ currentLedger: ledger })
      return true
    }
    return false
  },
  loadLedgerData: async (ledgerId) => {
    if (!isSupabaseConfigured) return
    try {
      const data = await api.fetchLedgerData(ledgerId)
      set({
        categories: data.categories,
        accounts: data.accounts,
        transactions: data.transactions,
        settlements: data.settlements,
        tags: data.tags,
        members: data.members,
      })
    } catch (e) {
      console.error('loadLedgerData error:', e)
    }
  },

  // Members
  members: isSupabaseConfigured ? [] : DEMO_MEMBERS,
  setMembers: (members) => set({ members }),

  // Categories
  categories: isSupabaseConfigured ? [] : DEMO_CATEGORIES,
  setCategories: (categories) => set({ categories }),

  // Accounts
  accounts: isSupabaseConfigured ? [] : DEMO_ACCOUNTS,
  setAccounts: (accounts) => set({ accounts }),

  // Transactions
  transactions: isSupabaseConfigured ? [] : DEMO_TRANSACTIONS,
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: async (transaction) => {
    // Optimistic update
    set((state) => ({ transactions: [transaction, ...state.transactions] }))
    if (isSupabaseConfigured) {
      try {
        await api.insertTransaction(transaction)
      } catch (e) {
        console.error('addTransaction error:', e)
        // Rollback
        set((state) => ({ transactions: state.transactions.filter(t => t.id !== transaction.id) }))
      }
    }
  },
  updateTransaction: (id, updates) => set((state) => ({
    transactions: state.transactions.map(t => t.id === id ? { ...t, ...updates } : t),
  })),
  deleteTransaction: async (id) => {
    const prev = get().transactions
    set((state) => ({ transactions: state.transactions.filter(t => t.id !== id) }))
    if (isSupabaseConfigured) {
      try {
        await api.deleteTransaction(id)
      } catch (e) {
        console.error('deleteTransaction error:', e)
        set({ transactions: prev })
      }
    }
  },
  clearTransactions: async () => {
    set({ transactions: [], settlements: [] })
    if (isSupabaseConfigured && get().currentLedger) {
      await api.deleteAllTransactions(get().currentLedger!.id)
    }
  },
  deleteTransactionsByFilter: (filter) => {
    const state = get()
    const before = state.transactions.length
    const filtered = state.transactions.filter((t) => {
      if (filter.categoryIds?.length && !filter.categoryIds.includes(t.category_id)) return true
      if (filter.before && t.occurred_at >= filter.before) return true
      if (filter.after && t.occurred_at < filter.after) return true
      return false
    })
    const deletedIds = new Set(state.transactions.map(t => t.id).filter(id => !filtered.find(f => f.id === id)))
    set({
      transactions: filtered,
      settlements: state.settlements.filter(s =>
        !s.related_transaction_ids?.some(tid => deletedIds.has(tid))
      ),
    })
    return before - filtered.length
  },

  // Settlements
  settlements: isSupabaseConfigured ? [] : DEMO_SETTLEMENTS,
  setSettlements: (settlements) => set({ settlements }),
  markSettled: async (id) => {
    set((state) => ({
      settlements: state.settlements.map(s =>
        s.id === id ? { ...s, status: 'settled' as const, settled_at: new Date().toISOString() } : s
      ),
    }))
    if (isSupabaseConfigured) {
      await api.markSettledRemote(id)
    }
  },

  // Tags
  tags: isSupabaseConfigured ? [] : DEMO_TAGS,
  setTags: (tags) => set({ tags }),
  addTag: async (name, color) => {
    const state = get()
    if (isSupabaseConfigured && state.currentLedger) {
      const data = await api.addTagRemote(state.currentLedger.id, name, color)
      if (data) {
        set((s) => ({ tags: [...s.tags, data as unknown as Tag] }))
      }
    } else {
      set((s) => ({
        tags: [...s.tags, {
          id: `tag_${generateId()}`,
          ledger_id: s.currentLedger?.id ?? '',
          name, color,
        }],
      }))
    }
  },
  deleteTag: async (id) => {
    set((state) => ({ tags: state.tags.filter(t => t.id !== id) }))
    if (isSupabaseConfigured) {
      await api.deleteTagRemote(id)
    }
  },

  // Budget
  monthlyBudget: isSupabaseConfigured ? 0 : 5000,
  setMonthlyBudget: (amount) => set({ monthlyBudget: amount }),

  // Data management
  resetLedger: async () => {
    set({
      transactions: [],
      settlements: [],
      categories: [],
      accounts: [],
      tags: [],
      monthlyBudget: 0,
    })
    if (isSupabaseConfigured && get().currentLedger) {
      await api.resetLedgerRemote(get().currentLedger!.id)
    }
  },

  // Realtime
  startRealtime: () => {
    if (!isSupabaseConfigured || !get().currentLedger) return
    get().stopRealtime()
    const ledgerId = get().currentLedger!.id
    realtimeCleanup = api.subscribeToLedger(ledgerId, async (event) => {
      // Reload data on any change
      await get().loadLedgerData(ledgerId)
    })
  },
  stopRealtime: () => {
    if (realtimeCleanup) {
      realtimeCleanup()
      realtimeCleanup = null
    }
  },

  // UI
  showAddTransaction: false,
  setShowAddTransaction: (show) => set({ showAddTransaction: show }),
}))
