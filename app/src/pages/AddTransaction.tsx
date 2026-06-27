import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X, ChevronDown, Calculator, Image, Tag, RotateCcw, Undo2, Settings } from 'lucide-react'
import { format } from 'date-fns'
import { useStore } from '../store'
import type {
  CategoryType,
  TransactionType,
  TransactionScope,
  SplitMethod,
  Transaction,
  Category,
} from '../types'

// ── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** Evaluate a simple math expression string (supports + - × ÷) */
function evaluateExpression(expr: string): number {
  if (!expr) return 0
  // Replace display symbols with JS operators
  const sanitized = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[^0-9+\-*/.()]/g, '')
  if (!sanitized) return 0
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${sanitized})`)()
    if (typeof result === 'number' && isFinite(result)) {
      return Math.round(result * 100) / 100
    }
    return 0
  } catch {
    return 0
  }
}

function formatAmount(value: string): string {
  const num = evaluateExpression(value)
  if (num === 0 && !value) return '0.00'
  return num.toFixed(2)
}

// ── Tab types ────────────────────────────────────────────────────────

const TAB_CONFIG = [
  { key: 'expense' as CategoryType, label: '支出', txType: 'expense' as TransactionType },
  { key: 'income' as CategoryType, label: '收入', txType: 'income' as TransactionType },
  { key: 'transfer' as CategoryType, label: '转账', txType: 'transfer' as TransactionType },
] as const

type ScopeOption = { key: TransactionScope | 'self' | 'partner' | 'both' | 'family'; label: string }

const SCOPE_OPTIONS: ScopeOption[] = [
  { key: 'self', label: '我' },
  { key: 'partner', label: '对方' },
  { key: 'both', label: '两人' },
  { key: 'family', label: '家庭' },
]

const EXPENSE_ATTR_OPTIONS = [
  { key: 'personal' as const, label: '个人支出' },
  { key: 'shared' as const, label: '共同支出' },
]

const SPLIT_OPTIONS: { key: SplitMethod; label: string }[] = [
  { key: 'equal', label: '平均分' },
  { key: 'single', label: '一人承担' },
  { key: 'ratio', label: '按比例' },
  { key: 'custom', label: '指定金额' },
]

// ── Component ────────────────────────────────────────────────────────

export default function AddTransaction() {
  const [searchParams] = useSearchParams()

  // Store selectors
  const categories = useStore((s) => s.categories)
  const accounts = useStore((s) => s.accounts)
  const members = useStore((s) => s.members)
  const currentLedger = useStore((s) => s.currentLedger)
  const currentUser = useStore((s) => s.currentUser)
  const addTransaction = useStore((s) => s.addTransaction)
  const setShowAddTransaction = useStore((s) => s.setShowAddTransaction)

  // ── State ──────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<CategoryType>(
    () => (searchParams.get('type') as CategoryType) || 'expense'
  )
  const currentTabConfig = TAB_CONFIG.find((t) => t.key === activeTab)!

  const filteredCategories = useMemo(
    () =>
      categories
        .filter((c) => c.type === activeTab)
        .sort((a, b) => a.sort_order - b.sort_order),
    [categories, activeTab]
  )

  const preselectedCatId = searchParams.get('category') || undefined

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    preselectedCatId || filteredCategories[0]?.id || null
  )

  // Reset selected category when tab changes
  useEffect(() => {
    const cats = categories
      .filter((c) => c.type === activeTab)
      .sort((a, b) => a.sort_order - b.sort_order)
    setSelectedCategoryId(cats[0]?.id || null)
  }, [activeTab, categories])

  // Amount
  const [amountStr, setAmountStr] = useState('')
  const [activeOperator, setActiveOperator] = useState<string | null>(null)

  // Date / time
  const [occurredAt] = useState(() => new Date())

  // Note
  const [note, setNote] = useState('')
  const noteInputRef = useRef<HTMLInputElement>(null)

  // Account
  const defaultAccountId = currentLedger?.default_account_id || accounts[0]?.id || ''
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const accountTriggerRef = useRef<HTMLButtonElement>(null)
  const [triggerRect, setTriggerRect] = useState<{top: number; left: number} | null>(null)

  // Advanced fields
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [payerUserId, setPayerUserId] = useState(currentUser?.id || '')
  const [consumeTarget, setConsumeTarget] = useState<ScopeOption['key']>('self')
  const [expenseAttr, setExpenseAttr] = useState<'personal' | 'shared'>('shared')
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(
    currentLedger?.default_split_method || 'equal'
  )

  // ── Derived ────────────────────────────────────────────────────────

  const selectedCategory = useMemo(
    () => filteredCategories.find((c) => c.id === selectedCategoryId) || null,
    [filteredCategories, selectedCategoryId]
  )

  const displayAmount = useMemo(() => formatAmount(amountStr), [amountStr])

  const isExpense = activeTab === 'expense'
  const isIncome = activeTab === 'income'
  const accentColor = isExpense ? 'var(--color-expense)' : isIncome ? 'var(--color-income)' : 'var(--color-primary)'
  const accentBg = isExpense ? 'bg-expense' : isIncome ? 'bg-income' : 'bg-primary'

  const currentAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  )

  const currentPayer = useMemo(
    () => members.find((m) => m.user_id === payerUserId),
    [members, payerUserId]
  )

  // Subcategories of selected parent category
  const subCategories = useMemo(
    () => categories
      .filter((c) => c.parent_id === selectedCategoryId)
      .sort((a, b) => a.sort_order - b.sort_order),
    [categories, selectedCategoryId]
  )

  // ── Keypad handlers ────────────────────────────────────────────────

  const handleNumber = useCallback(
    (digit: string) => {
      setAmountStr((prev) => {
        // Prevent multiple dots in current segment
        if (digit === '.') {
          // Find the last number segment (after last operator)
          const lastOpIdx = Math.max(
            prev.lastIndexOf('+'),
            prev.lastIndexOf('-'),
            prev.lastIndexOf('×'),
            prev.lastIndexOf('÷')
          )
          const segment = prev.slice(lastOpIdx + 1)
          if (segment.includes('.')) return prev
        }
        // Prevent leading zeros like "00", "01" (but allow "0.")
        if (digit !== '.' && digit !== '0') {
          // normal digit, fine
        }
        // Limit total length
        if (prev.length > 20) return prev
        setActiveOperator(null)
        return prev + digit
      })
    },
    []
  )

  const handleOperator = useCallback((op: string) => {
    setAmountStr((prev) => {
      if (!prev) return prev
      // If last char is already an operator, replace it
      const lastChar = prev[prev.length - 1]
      if (['+', '-', '×', '÷'].includes(lastChar)) {
        return prev.slice(0, -1) + op
      }
      setActiveOperator(op)
      return prev + op
    })
  }, [])

  const handleDelete = useCallback(() => {
    setAmountStr((prev) => {
      if (!prev) return prev
      const next = prev.slice(0, -1)
      // Update active operator if the new last char is an operator
      const lastChar = next[next.length - 1]
      if (['+', '-', '×', '÷'].includes(lastChar)) {
        setActiveOperator(lastChar)
      } else {
        setActiveOperator(null)
      }
      return next
    })
  }, [])

  // ── Save logic ─────────────────────────────────────────────────────

  const canSave = amountStr && evaluateExpression(amountStr) > 0 && selectedCategoryId

  const buildTransaction = useCallback((): Transaction | null => {
    if (!canSave || !currentLedger || !currentUser || !selectedCategoryId) return null
    const amount = evaluateExpression(amountStr)
    if (amount <= 0) return null

    const now = new Date().toISOString()
    const scope: TransactionScope = expenseAttr === 'shared' ? 'shared' : 'personal'

    const tx: Transaction = {
      id: generateId(),
      ledger_id: currentLedger.id,
      type: currentTabConfig.txType,
      amount,
      currency: currentLedger.currency,
      category_id: selectedCategoryId,
      account_id: selectedAccountId || undefined,
      creator_user_id: currentUser.id,
      payer_user_id: payerUserId || currentUser.id,
      scope,
      occurred_at: occurredAt.toISOString(),
      note: note || undefined,
      tags: [],
      image_urls: [],
      is_private: false,
      privacy_level: 'public',
      is_included_in_budget: true,
      created_at: now,
      updated_at: now,
      category: selectedCategory || undefined,
      account: currentAccount || undefined,
      payer: currentPayer || undefined,
    }

    return tx
  }, [
    canSave, currentLedger, currentUser, selectedCategoryId, amountStr,
    currentTabConfig.txType, expenseAttr, selectedAccountId, payerUserId,
    occurredAt, note, selectedCategory, currentAccount, currentPayer,
  ])

  const handleSave = useCallback(() => {
    const tx = buildTransaction()
    if (!tx) return
    addTransaction(tx)
    setShowAddTransaction(false)
  }, [buildTransaction, addTransaction, setShowAddTransaction])

  const handleSaveAndContinue = useCallback(() => {
    const tx = buildTransaction()
    if (!tx) return
    addTransaction(tx)
    // Reset form but stay on page
    setAmountStr('')
    setActiveOperator(null)
    setNote('')
  }, [buildTransaction, addTransaction])

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-bg h-dvh overflow-hidden">
      {/* ═══ Top Bar ═══ */}
      <div className="flex items-center justify-between px-4 py-4 bg-card border-b border-divider shrink-0">
        <button
          onClick={() => setShowAddTransaction(false)}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100"
        >
          <X size={22} className="text-text" />
        </button>

        <div className="flex gap-1.5 bg-bg rounded-full p-1">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-5 py-2 rounded-full text-sm font-medium transition-all
                ${activeTab === tab.key
                  ? 'bg-card text-text shadow-sm'
                  : 'text-text-secondary'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-text-muted whitespace-nowrap">
          {currentLedger?.name || '默认账本'}
        </span>
      </div>

      {/* ═══ Scrollable middle area ═══ */}
      <div className="flex-1 overflow-y-auto overscroll-contain">

        {/* ── Category Grid ── */}
        <div className="px-3 pt-4 pb-2">
          <div className="grid grid-cols-5 gap-y-4 gap-x-2">
            {filteredCategories.map((cat: Category) => {
              const isSelected = cat.id === selectedCategoryId
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center text-xl
                      transition-all duration-150
                      ${isSelected
                        ? 'ring-2 ring-offset-2 scale-105'
                        : 'opacity-85 hover:opacity-100'
                      }
                    `}
                    style={{
                      backgroundColor: isSelected ? cat.color + '20' : cat.color + '15',
                      ringColor: cat.color,
                      ...(isSelected ? { boxShadow: `0 0 0 2px ${cat.color}, 0 0 0 4px ${cat.color}30` } : {}),
                    }}
                  >
                    {cat.icon}
                  </div>
                  <span
                    className={`text-[11px] leading-tight ${isSelected ? 'text-text font-medium' : 'text-text-secondary'}`}
                  >
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Subcategory Row ── */}
        {subCategories.length > 0 && (
          <div className="px-3 pb-2">
            <div className="flex gap-2 overflow-x-auto py-1" style={{ scrollbarWidth: 'none' }}>
              {subCategories.map((sub) => {
                const isSubSelected = sub.id === selectedCategoryId
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedCategoryId(sub.id)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSubSelected
                        ? 'text-white shadow-sm'
                        : 'bg-gray-100 text-text-secondary'
                    }`}
                    style={isSubSelected ? { backgroundColor: sub.color } : undefined}
                  >
                    {sub.icon} {sub.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Quick Action Buttons ── */}
        <div
          className="flex items-center gap-3 px-4 py-3 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Account selector */}
          <div className="shrink-0">
            <button
              ref={accountTriggerRef}
              onClick={() => {
                if (accountTriggerRef.current) {
                  const rect = accountTriggerRef.current.getBoundingClientRect()
                  setTriggerRect({ top: rect.bottom + 4, left: rect.left })
                }
                setShowAccountDropdown((v) => !v)
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-xs text-text-secondary active:bg-gray-200"
            >
              <span>{currentAccount?.name || '选择账户'}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${showAccountDropdown ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <QuickAction icon={<RotateCcw size={14} />} label="报销" onClick={() => {}} />
          <QuickAction icon={<Calculator size={14} />} label="优惠" onClick={() => {}} />
          <QuickAction icon={<Image size={14} />} label="图片" onClick={() => {}} />
          <QuickAction icon={<Tag size={14} />} label="标签" onClick={() => {}} />
          <QuickAction icon={<Settings size={14} />} label="设置" onClick={() => {}} />
        </div>

      </div>

      {/* ═══ Amount Display (fixed) ═══ */}
      <div className="shrink-0 bg-card border-t border-divider px-4 py-3 flex flex-col items-center">
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-light" style={{ color: accentColor }}>¥</span>
          <span
            className="text-5xl font-extralight tracking-tight tabular-nums"
            style={{ color: accentColor }}
          >
            {displayAmount}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 w-full max-w-[280px]">
          <span className="text-xs text-text-muted shrink-0">
            {format(occurredAt, 'MM-dd HH:mm')}
          </span>
          <input
            ref={noteInputRef}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="添加备注"
            className="flex-1 text-right text-xs text-text-secondary placeholder:text-text-muted
                       border-b border-divider pb-0.5 focus:border-primary transition-colors outline-none"
            maxLength={100}
          />
        </div>
      </div>

      {/* ═══ Number Keypad ═══ */}
      <div className="shrink-0 bg-card border-t border-divider pb-[env(safe-area-inset-bottom)]">
        {/* Operator row */}
        <div className="grid grid-cols-4 gap-px bg-divider">
          {(['+', '-', '×', '÷'] as const).map((op) => {
            const isActive = activeOperator === op
            return (
              <button
                key={op}
                onClick={() => handleOperator(op)}
                className={`
                  h-11 flex items-center justify-center text-lg font-medium bg-card
                  active:bg-gray-100 transition-colors
                  ${isActive ? 'text-primary bg-blue-50' : 'text-text-secondary'}
                `}
              >
                {op}
              </button>
            )
          })}
        </div>

        {/* Number grid: 4 rows x 4 cols */}
        <div
          className="grid gap-px bg-divider"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'repeat(4, 3.5rem)',
          }}
        >
          {/* Row 1: 1 2 3 Del */}
          <NumKey label="1" onClick={() => handleNumber('1')} />
          <NumKey label="2" onClick={() => handleNumber('2')} />
          <NumKey label="3" onClick={() => handleNumber('3')} />
          <button
            onClick={handleDelete}
            className="flex items-center justify-center bg-card active:bg-gray-100"
          >
            <Undo2 size={20} className="text-text-secondary" />
          </button>

          {/* Row 2: 4 5 6 + 完成 (spans rows 2-4) */}
          <NumKey label="4" onClick={() => handleNumber('4')} />
          <NumKey label="5" onClick={() => handleNumber('5')} />
          <NumKey label="6" onClick={() => handleNumber('6')} />
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`
              row-span-3 flex items-center justify-center text-white text-base font-medium
              transition-opacity
              ${canSave ? 'opacity-100 active:opacity-80' : 'opacity-40'}
            `}
            style={{
              backgroundColor: canSave ? accentColor : '#ccc',
              gridColumn: 4,
              gridRow: '2 / 5',
            }}
          >
            完成
          </button>

          {/* Row 3: 7 8 9 */}
          <NumKey label="7" onClick={() => handleNumber('7')} />
          <NumKey label="8" onClick={() => handleNumber('8')} />
          <NumKey label="9" onClick={() => handleNumber('9')} />

          {/* Row 4: . 0 保存再记 */}
          <NumKey label="." onClick={() => handleNumber('.')} />
          <NumKey label="0" onClick={() => handleNumber('0')} />
          <button
            onClick={handleSaveAndContinue}
            disabled={!canSave}
            className={`
              flex items-center justify-center text-xs font-medium bg-card
              transition-colors
              ${canSave ? 'text-text active:bg-gray-100' : 'text-text-muted'}
            `}
          >
            保存再记
          </button>
        </div>
      </div>

      {/* Account dropdown - fixed to avoid scrollable clipping */}
      {showAccountDropdown && (
        <>
          <div
            className="fixed inset-0 z-[80]"
            onClick={() => setShowAccountDropdown(false)}
          />
          {triggerRect && (
            <div
              className="fixed z-[81] bg-card rounded-xl shadow-lg border border-divider min-w-[140px] py-1"
              style={{ top: triggerRect.top, left: triggerRect.left }}
            >
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    setSelectedAccountId(acc.id)
                    setShowAccountDropdown(false)
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    acc.id === selectedAccountId ? 'text-primary font-medium' : 'text-text'
                  }`}
                >
                  {acc.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="shrink-0 flex flex-col items-center gap-0.5 active:opacity-60">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary">
        {icon}
      </div>
      <span className="text-[10px] text-text-muted">{label}</span>
    </button>
  )
}

function AdvancedSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-text-muted mb-2">{title}</div>
      {children}
    </div>
  )
}

function NumKey({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="h-14 flex items-center justify-center text-xl font-normal text-text bg-card
                 active:bg-gray-100 transition-colors select-none"
    >
      {label}
    </button>
  )
}
