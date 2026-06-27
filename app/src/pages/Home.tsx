import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, FileText, Calendar } from 'lucide-react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useStore } from '../store'
import type { Transaction, LedgerMember } from '../types'

export default function Home() {
  const navigate = useNavigate()
  const { currentLedger, members, transactions, currentUser } = useStore()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [summaryPage, setSummaryPage] = useState(0)

  // Filter transactions for the selected month + optional search
  const monthlyTransactions = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    return transactions
      .filter((t) => {
        const d = parseISO(t.occurred_at)
        return d.getFullYear() === year && d.getMonth() === month
      })
      .filter((t) => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (
          t.note?.toLowerCase().includes(q) ||
          t.category?.name?.toLowerCase().includes(q) ||
          false
        )
      })
      .sort(
        (a, b) =>
          parseISO(b.occurred_at).getTime() - parseISO(a.occurred_at).getTime()
      )
  }, [transactions, currentDate, searchQuery])

  // Monthly stats
  const stats = useMemo(() => {
    const expenses = monthlyTransactions.filter((t) => t.type === 'expense')
    const incomes = monthlyTransactions.filter((t) => t.type === 'income')
    const sharedExpenses = expenses.filter((t) => t.scope === 'shared')

    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0)
    const sharedExpense = sharedExpenses.reduce((s, t) => s + t.amount, 0)

    // How much current user actually paid toward shared expenses
    const mySharedPaid = sharedExpenses
      .filter((t) => t.payer_user_id === currentUser?.id)
      .reduce((s, t) => s + t.amount, 0)

    // How much current user should pay (from splits, or equal-split fallback)
    const memberCount = members.length || 1
    const myShareOfShared = sharedExpenses.reduce((s, t) => {
      const split = t.splits?.[0]
      if (split) {
        const myItem = split.items.find((i) => i.user_id === currentUser?.id)
        if (myItem) return s + myItem.should_pay
      }
      return s + t.amount / memberCount
    }, 0)

    const overpaid = mySharedPaid - myShareOfShared

    return { totalExpense, totalIncome, balance: totalIncome - totalExpense, sharedExpense, overpaid }
  }, [monthlyTransactions, currentUser, members])

  // Group by date
  const groupedTransactions = useMemo(() => {
    const map = new Map<string, Transaction[]>()

    monthlyTransactions.forEach((t) => {
      const key = format(parseISO(t.occurred_at), 'yyyy-MM-dd')
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    })

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, txns]) => {
        const date = parseISO(txns[0].occurred_at)
        let label: string
        if (isToday(date)) {
          label = `今天 ${format(date, 'M月d日', { locale: zhCN })}`
        } else if (isYesterday(date)) {
          label = `昨天 ${format(date, 'M月d日', { locale: zhCN })}`
        } else {
          label = format(date, 'M月d日 EEEE', { locale: zhCN })
        }
        return { key: format(date, 'yyyy-MM-dd'), label, transactions: txns }
      })
  }, [monthlyTransactions])

  const prevMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))

  const nextMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  const getMember = (userId?: string): LedgerMember | undefined =>
    members.find((m) => m.user_id === userId)

  const isSharedLedger =
    currentLedger?.type === 'couple' ||
    currentLedger?.type === 'family' ||
    currentLedger?.type === 'roommate'

  const fmtAmount = (n: number) =>
    n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="min-h-dvh bg-bg pb-28">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="px-5 pt-12 pb-3">

        <div className="relative flex items-center justify-between mb-0">
          <h1 className="text-text text-lg font-bold leading-tight">
            {currentLedger?.name ?? '我的账本'}
          </h1>

          {/* Member avatars */}
          <div className="flex items-center">
            {members.slice(0, 5).map((member, i) => (
              <div
                key={member.id}
                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold ring-2 ring-primary/20"
                style={{ marginLeft: i === 0 ? 0 : -8, zIndex: members.length - i }}
                title={member.display_name}
              >
                {member.display_name.charAt(0)}
              </div>
            ))}
          </div>
        </div>

      </header>


      {/* ── Main content ───────────────────────────────────── */}
      <main className="px-5">
        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="搜索备注、分类..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-text placeholder:text-text-muted rounded-full pl-10 pr-4 py-2.5 text-sm outline-none card-shadow transition-colors"
          />
        </div>
        {/* Month selector */}
        <div className="flex items-center justify-between my-4">
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-text-secondary" />
          </button>
          <span className="text-[15px] font-semibold text-text select-none">
            {format(currentDate, 'yyyy年M月', { locale: zhCN })}
          </span>
          <button
            onClick={nextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Summary Cards (paginated) */}
        <div>
          {summaryPage === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 bg-white rounded-3xl p-6 card-shadow">
                <p className="text-text-muted text-xs font-medium mb-2">本月支出</p>
                <p className="text-expense text-[44px] font-black leading-none tracking-tight tabular-nums">
                  <span className="text-2xl font-bold align-top mr-0.5">¥</span>
                  {fmtAmount(stats.totalExpense)}
                </p>
              </div>
              <div className="bg-income-tint rounded-3xl p-5 card-shadow">
                <p className="text-text-muted text-xs font-medium mb-1.5">收入</p>
                <p className="text-income text-[22px] font-bold tabular-nums">
                  +¥{fmtAmount(stats.totalIncome)}
                </p>
              </div>
              <div className="bg-primary-tint rounded-3xl p-5 card-shadow">
                <p className="text-text-muted text-xs font-medium mb-1.5">结余</p>
                <p className={`text-[22px] font-bold tabular-nums ${
                  stats.balance >= 0 ? 'text-income' : 'text-expense'
                }`}>
                  {stats.balance >= 0 ? '+' : '-'}¥{fmtAmount(Math.abs(stats.balance))}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/settlement')}
                className="bg-white rounded-3xl p-5 card-shadow text-left active:bg-gray-50 transition-colors"
              >
                <p className="text-text-muted text-xs font-medium mb-1.5">共同支出</p>
                <p className="text-expense text-[22px] font-bold tabular-nums">
                  <span className="text-base align-top mr-0.5">¥</span>
                  {fmtAmount(stats.sharedExpense)}
                </p>
                {stats.overpaid !== 0 && (
                  <p className="text-primary text-[11px] font-medium mt-2">
                    {stats.overpaid > 0
                      ? `你多付了 ¥${fmtAmount(stats.overpaid)}`
                      : `对方多付了 ¥${fmtAmount(Math.abs(stats.overpaid))}`}
                  </p>
                )}
              </button>
              <div className="bg-white rounded-3xl p-5 card-shadow">
                <p className="text-text-muted text-xs font-medium mb-1.5">本月记账</p>
                <p className="text-text text-[22px] font-bold tabular-nums">
                  {groupedTransactions.reduce((sum, g) => sum + g.transactions.length, 0)}
                  <span className="text-xs font-normal text-text-muted ml-1">笔</span>
                </p>
              </div>
            </div>
          )}

          {/* Pagination dots */}
          {isSharedLedger && (
            <div className="flex justify-center gap-1.5 mt-3">
              <button
                onClick={() => setSummaryPage(0)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  summaryPage === 0 ? 'bg-amber-400' : 'bg-gray-300'
                }`}
              />
              <button
                onClick={() => setSummaryPage(1)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  summaryPage === 1 ? 'bg-amber-400' : 'bg-gray-300'
                }`}
              />
            </div>
          )}
        </div>

        {/* Transaction list */}
        {groupedTransactions.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-3xl p-8 card-shadow flex flex-col items-center justify-center py-16 text-center select-none">
            <div className="w-24 h-24 bg-primary-tint rounded-full flex items-center justify-center mb-5">
              <FileText size={40} className="text-primary/30" />
            </div>
            <p className="text-text-secondary text-sm font-medium mb-1">
              {searchQuery ? '没有找到相关记录' : '本月暂无账单'}
            </p>
            <p className="text-text-muted text-xs">
              {searchQuery ? '换个关键词试试' : '点击下方按钮记一笔吧'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => useStore.getState().setShowAddTransaction(true)}
                className="mt-4 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-medium active:opacity-80"
              >
                记一笔
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {groupedTransactions.map((group) => (
              <div key={group.key}>
                {/* Date header */}
                <p className="text-text-secondary text-xs font-semibold mb-2 px-1 select-none">
                  {group.label}
                </p>

                {/* Transaction items */}
                <div className="bg-white rounded-3xl card-shadow divide-y divide-divider overflow-hidden">
                  {group.transactions.map((t) => {
                    const member = getMember(t.payer_user_id)
                    const isIncome = t.type === 'income'

                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/transaction/${t.id}`)}
                      >
                        {/* Category icon */}
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                          style={{
                            backgroundColor: `${t.category?.color ?? '#9E9E9E'}18`,
                          }}
                        >
                          {t.category?.icon ?? '📌'}
                        </div>

                        {/* Middle info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm font-semibold text-text truncate">
                              {t.category?.name ?? '其他'}
                            </span>
                            {t.scope === 'shared' && (
                              <span className="shrink-0 text-[10px] font-semibold text-primary bg-primary-light px-1.5 py-0.5 rounded-full leading-none">
                                共同
                              </span>
                            )}
                            {t.scope === 'personal' && (
                              <span className="shrink-0 text-[10px] font-medium text-text-muted bg-gray-100 px-1.5 py-0.5 rounded-full leading-none">
                                个人
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            {t.note ? (
                              <span className="truncate">{t.note}</span>
                            ) : null}
                            {member && (
                              <>
                                {t.note && <span className="shrink-0 text-text-muted">·</span>}
                                <span className={`shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                  member.user_id === currentUser?.id
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-orange-50 text-orange-500'
                                }`}>
                                  <span className="w-3.5 h-3.5 rounded-full bg-current/20 text-current text-[8px] font-bold flex items-center justify-center">
                                    {member.display_name.charAt(0)}
                                  </span>
                                  {member.display_name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <p
                          className={`shrink-0 text-base font-bold tabular-nums ${
                            isIncome ? 'text-income' : 'text-text'
                          }`}
                        >
                          {isIncome ? '+' : '-'}¥{t.amount.toFixed(2)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
