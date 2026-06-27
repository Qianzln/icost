import { supabase } from './supabase'
import type {
  Profile, Ledger, LedgerMember, Category, Account,
  Transaction, Settlement, Tag,
} from '../types'

// ─── Auth ─────────────────────────────────────

export async function signUp(email: string, password: string, nickname: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (data.user) {
    await supabase.from('profiles').insert({
      id: data.user.id,
      nickname,
    })
  }
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data as Profile | null
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  await supabase.from('profiles').update(updates).eq('id', userId)
}

// ─── Ledger ───────────────────────────────────

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function createLedger(name: string, type: Ledger['type'], ownerId: string): Promise<Ledger> {
  const invite_code = generateInviteCode()
  const { data, error } = await supabase.from('ledgers').insert({
    name, type, currency: 'CNY', cover_icon: 'home',
    owner_id: ownerId, default_split_method: 'equal', invite_code,
  }).select().single()
  if (error) throw error

  // Add owner as member
  const profile = await getProfile(ownerId)
  await supabase.from('ledger_members').insert({
    ledger_id: data.id, user_id: ownerId, role: 'owner',
    display_name: profile?.nickname || '\u6211',
  })

  // Seed default categories
  await supabase.rpc('seed_default_categories', { p_ledger_id: data.id })

  return data as unknown as Ledger
}

export async function fetchUserLedgers(userId: string): Promise<Ledger[]> {
  const { data: memberships } = await supabase
    .from('ledger_members')
    .select('ledger_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (!memberships?.length) return []

  const ledgerIds = memberships.map(m => m.ledger_id)
  const { data: ledgers } = await supabase
    .from('ledgers')
    .select('*')
    .in('id', ledgerIds)

  return (ledgers || []) as unknown as Ledger[]
}

export async function joinLedgerByCode(code: string, userId: string): Promise<Ledger | null> {
  const { data: ledger } = await supabase
    .from('ledgers')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (!ledger) return null

  // Check if already a member
  const { data: existing } = await supabase
    .from('ledger_members')
    .select('id')
    .eq('ledger_id', ledger.id)
    .eq('user_id', userId)
    .single()

  if (!existing) {
    const profile = await getProfile(userId)
    await supabase.from('ledger_members').insert({
      ledger_id: ledger.id, user_id: userId, role: 'member',
      display_name: profile?.nickname || '\u65b0\u6210\u5458',
    })
  }

  return ledger as unknown as Ledger
}

// ─── Ledger Data (bulk fetch) ─────────────────

export async function fetchLedgerData(ledgerId: string) {
  const [catRes, accRes, txRes, setRes, tagRes, memRes] = await Promise.all([
    supabase.from('categories').select('*').eq('ledger_id', ledgerId).order('sort_order'),
    supabase.from('accounts').select('*').eq('ledger_id', ledgerId),
    supabase.from('transactions').select('*').eq('ledger_id', ledgerId).order('occurred_at', { ascending: false }),
    supabase.from('settlements').select('*').eq('ledger_id', ledgerId),
    supabase.from('tags').select('*').eq('ledger_id', ledgerId),
    supabase.from('ledger_members').select('*, profiles(*)').eq('ledger_id', ledgerId).eq('status', 'active'),
  ])

  const categories = (catRes.data || []) as unknown as Category[]
  const accounts = (accRes.data || []) as unknown as Account[]
  const rawTx = (txRes.data || []) as unknown as Transaction[]
  const settlements = (setRes.data || []) as unknown as Settlement[]
  const tags = (tagRes.data || []) as unknown as Tag[]

  // Process members — flatten profile into member
  const members: LedgerMember[] = (memRes.data || []).map((m: any) => ({
    id: m.id,
    ledger_id: m.ledger_id,
    user_id: m.user_id,
    role: m.role,
    display_name: m.display_name,
    avatar_url: m.avatar_url,
    joined_at: m.joined_at,
    status: m.status,
    profile: m.profiles ? {
      id: m.profiles.id,
      nickname: m.profiles.nickname,
      avatar_url: m.profiles.avatar_url,
      phone: m.profiles.phone,
      created_at: m.profiles.created_at,
    } : undefined,
  }))

  // Enrich transactions with joined data
  const transactions = rawTx.map(tx => ({
    ...tx,
    category: categories.find(c => c.id === tx.category_id),
    account: accounts.find(a => a.id === tx.account_id),
    payer: members.find(m => m.user_id === tx.payer_user_id),
  }))

  return { categories, accounts, transactions, settlements, tags, members }
}

// ─── Transactions ─────────────────────────────

export async function insertTransaction(tx: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'category' | 'account' | 'payer'>) {
  const { data, error } = await supabase.from('transactions').insert({
    ledger_id: tx.ledger_id,
    type: tx.type,
    amount: tx.amount,
    currency: tx.currency,
    category_id: tx.category_id,
    account_id: tx.account_id || null,
    creator_user_id: tx.creator_user_id,
    payer_user_id: tx.payer_user_id || null,
    scope: tx.scope,
    occurred_at: tx.occurred_at,
    note: tx.note || null,
    tags: tx.tags || [],
    image_urls: tx.image_urls || [],
    is_private: tx.is_private,
    privacy_level: tx.privacy_level,
    is_included_in_budget: tx.is_included_in_budget,
  }).select().single()
  if (error) throw error
  return data
}

export async function deleteTransaction(id: string) {
  await supabase.from('transactions').delete().eq('id', id)
}

export async function deleteAllTransactions(ledgerId: string) {
  await supabase.from('transactions').delete().eq('ledger_id', ledgerId)
  await supabase.from('settlements').delete().eq('ledger_id', ledgerId)
}

// ─── Settlements ──────────────────────────────

export async function markSettledRemote(id: string) {
  await supabase.from('settlements').update({
    status: 'settled',
    settled_at: new Date().toISOString(),
  }).eq('id', id)
}

// ─── Tags ─────────────────────────────────────

export async function addTagRemote(ledgerId: string, name: string, color: string) {
  const { data } = await supabase.from('tags').insert({ ledger_id: ledgerId, name, color }).select().single()
  return data
}

export async function deleteTagRemote(id: string) {
  await supabase.from('tags').delete().eq('id', id)
}

// ─── Reset ────────────────────────────────────

export async function resetLedgerRemote(ledgerId: string) {
  await Promise.all([
    supabase.from('transactions').delete().eq('ledger_id', ledgerId),
    supabase.from('settlements').delete().eq('ledger_id', ledgerId),
    supabase.from('categories').delete().eq('ledger_id', ledgerId),
    supabase.from('accounts').delete().eq('ledger_id', ledgerId),
    supabase.from('tags').delete().eq('ledger_id', ledgerId),
  ])
}

// ─── Realtime ─────────────────────────────────

export function subscribeToLedger(
  ledgerId: string,
  onChange: (event: { type: string; table: string; payload: any }) => void
) {
  const channel = supabase
    .channel(`ledger_${ledgerId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      filter: `ledger_id=eq.${ledgerId}`,
    }, (payload) => {
      onChange({
        type: payload.eventType,
        table: (payload as any).table || '',
        payload: payload.new || payload.old,
      })
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
