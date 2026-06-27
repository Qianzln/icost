import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  format, addMonths, subMonths, addWeeks, subWeeks, addYears, subYears,
  differenceInDays, isWithinInterval,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useStore } from '../store'
import type { Category, LedgerMember } from '../types'

type PeriodType = 'week' | 'month' | 'year' | 'all' | 'range'

const PERIOD_TABS: { key: PeriodType; label: string }[] = [
  { key: 'week', label: '周' },
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
  { key: 'all', label: '全部' },
  { key: 'range', label: '范围' },
]

const CHART_COLORS = [
  '#3A9CFF', '#F45D55', '#35C77B', '#FF85A1', '#FFD700',
  '#9B59B6', '#00BCD4', '#FF6B35', '#607D8B', '#E91E63',
  '#4CAF50', '#3498DB', '#FF9800', '#8B6914', '#2C3E80',
]

export default function Statistics() {
  const navigate = useNavigate()
  const { transactions, categories, members, currentUser } = useStore()

  const [period, setPeriod] = useState<PeriodType>('month')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [rangeStart, _setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, _setRangeEnd] = useState<Date | null>(null)
  const [statsType, setStatsType] = useState<'expense' | 'income'>('expense')
  const [foldedSections, setFoldedSections] = useState<Record<string, boolean>>({
    income_expense: false,
    reimbursement: true,
    flow: true,
  })

  const toggleSection = (key: string) => {
    setFoldedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const fmtStat = (n: number) =>
    '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const currentUserId = currentUser?.id ?? ''

  // Compute date range based on period
  const { startDate, endDate } = useMemo(() => {
    switch (period) {
      case 'week':
        return {
          startDate: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          endDate: endOfWeek(selectedDate, { weekStartsOn: 1 }),
        }
      case 'month':
        return {
          startDate: startOfMonth(selectedDate),
          endDate: endOfMonth(selectedDate),
        }
      case 'year':
        return {
          startDate: startOfYear(selectedDate),
          endDate: endOfYear(selectedDate),
        }
      case 'all':
        return {
          startDate: new Date(2000, 0, 1),
          endDate: new Date(2100, 0, 1),
        }
      case 'range':
        return {
          startDate: rangeStart ?? startOfMonth(selectedDate),
          endDate: rangeEnd ?? endOfMonth(selectedDate),
        }
      default:
        return {
          startDate: startOfMonth(selectedDate),
          endDate: endOfMonth(selectedDate),
        }
    }
  }, [period, selectedDate, rangeStart, rangeEnd])

  // Filter transactions by period
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const d = new Date(tx.occurred_at)
      return isWithinInterval(d, { start: startDate, end: endDate })
    })
  }, [transactions, startDate, endDate])

  // Expense and income totals
  const expenses = useMemo(() => filtered.filter(t => t.type === 'expense'), [filtered])
  const incomes = useMemo(() => filtered.filter(t => t.type === 'income'), [filtered])
  const totalExpense = useMemo(() => expenses.reduce((s, t) => s + t.amount, 0), [expenses])
  const totalIncome = useMemo(() => incomes.reduce((s, t) => s + t.amount, 0), [incomes])
  const balance = totalIncome - totalExpense

  // Daily average
  const dayCount = useMemo(() => {
    const days = differenceInDays(endDate, startDate) + 1
    return Math.max(days, 1)
  }, [startDate, endDate])
  const dailyAvgExpense = totalExpense / dayCount

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const targetTxns = statsType === 'expense' ? expenses : incomes
    const map = new Map<string, { category: Category | undefined; amount: number }>()

    targetTxns.forEach(tx => {
      const existing = map.get(tx.category_id)
      if (existing) {
        existing.amount += tx.amount
      } else {
        map.set(tx.category_id, {
          category: tx.category ?? categories.find(c => c.id === tx.category_id),
          amount: tx.amount,
        })
      }
    })

    const total = targetTxns.reduce((s, t) => s + t.amount, 0)
    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .map(item => ({
        ...item,
        percentage: total > 0 ? (item.amount / total) * 100 : 0,
      }))
  }, [expenses, incomes, categories, statsType])

  // Pie chart data
  const pieData = useMemo(
    () =>
      categoryBreakdown.map((item, i) => ({
        name: item.category?.name ?? '其他',
        value: item.amount,
        color: item.category?.color ?? CHART_COLORS[i % CHART_COLORS.length],
      })),
    [categoryBreakdown],
  )

  // Member breakdown
  const memberBreakdown = useMemo(() => {
    return members
      .filter(m => m.status === 'active')
      .map(m => {
        const memberTxns = filtered.filter(t => t.payer_user_id === m.user_id)
        const paid = memberTxns.reduce((s, t) => s + t.amount, 0)
        const memberExpenses = memberTxns.filter(t => t.type === 'expense')
        const totalPaid = memberExpenses.reduce((s, t) => s + t.amount, 0)
        const share =
          totalExpense > 0 ? (totalPaid / totalExpense) * 100 : 0
        return {
          member: m,
          paid,
          expensePaid: totalPaid,
          share,
        }
      })
  }, [filtered, members, totalExpense])

  // Shared expense ratio
  const sharedExpenseRatio = useMemo(() => {
    const sharedExpenses = expenses.filter(t => t.scope === 'shared')
    const sharedTotal = sharedExpenses.reduce((s, t) => s + t.amount, 0)
    return totalExpense > 0 ? (sharedTotal / totalExpense) * 100 : 0
  }, [expenses, totalExpense])

  // Navigation helpers
  const goPrev = () => {
    if (period === 'week') setSelectedDate(d => subWeeks(d, 1))
    else if (period === 'month') setSelectedDate(d => subMonths(d, 1))
    else if (period === 'year') setSelectedDate(d => subYears(d, 1))
  }
  const goNext = () => {
    if (period === 'week') setSelectedDate(d => addWeeks(d, 1))
    else if (period === 'month') setSelectedDate(d => addMonths(d, 1))
    else if (period === 'year') setSelectedDate(d => addYears(d, 1))
  }

  const periodLabel = () => {
    switch (period) {
      case 'week':
        return `${format(startDate, 'MM/dd')} - ${format(endDate, 'MM/dd')}`
      case 'month':
        return format(selectedDate, 'yyyy年M月', { locale: zhCN })
      case 'year':
        return format(selectedDate, 'yyyy年', { locale: zhCN })
      case 'all':
        return '全部时间'
      case 'range':
        return `${format(startDate, 'MM/dd')} - ${format(endDate, 'MM/dd')}`
      default:
        return ''
    }
  }

  const getMemberName = (m: LedgerMember) => {
    if (m.user_id === currentUserId) return '我'
    return m.display_name
  }

  return (
    <div className="min-h-dvh pb-24 bg-bg">
      {/* Header */}
      <div className="px-5 pt-12 pb-2">

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate('/')} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-100">
              <ChevronLeft size={20} className="text-text-secondary" />
            </button>
            <h1 className="text-lg font-bold text-text">统计</h1>
            <div className="w-9" />
          </div>
        </div>
      </div>


      {/* Summary Card */}
      <div className="mx-4 mt-3 flex justify-center gap-3">
        <div className="bg-expense-tint rounded-2xl px-5 py-3 text-center min-w-[130px] card-shadow">
          <p className="text-text-muted text-[10px] tracking-wider mb-0.5">支出</p>
          <p className="text-expense text-base font-bold tabular-nums">¥{totalExpense.toFixed(0)}</p>
        </div>
        <div className="bg-income-tint rounded-2xl px-5 py-3 text-center min-w-[130px] card-shadow">
          <p className="text-text-muted text-[10px] tracking-wider mb-0.5">收入</p>
          <p className="text-income text-base font-bold tabular-nums">¥{totalIncome.toFixed(0)}</p>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="mx-4 mt-3 flex bg-white rounded-3xl p-1 card-shadow">
        {PERIOD_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
              period === tab.key ? 'bg-primary text-white' : 'text-gray-500'
            }`}

          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Selector */}
      {period !== 'all' && (
        <div className="mx-4 mt-3 flex items-center justify-between bg-white rounded-3xl px-4 py-3 card-shadow">
          <button
            onClick={goPrev}
            className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <span className="text-sm font-medium text-gray-700">{periodLabel()}</span>
          <button
            onClick={goNext}
            className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100"
          >
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>
      )}

      {/* ═══ Foldable Stat Sections ═══ */}

      {/* 收支统计 */}
      <div className="mx-4 mt-3">
        <button
          onClick={() => toggleSection('income_expense')}
          className="w-full flex items-center gap-2 mb-2"
        >
          <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-amber-600 text-xs">¥</span>
          </span>
          <span className="text-sm font-semibold text-text">收支统计</span>
          <ChevronDown
            size={16}
            className={`text-text-muted transition-transform ${foldedSections.income_expense ? '' : 'rotate-180'}`}
          />
        </button>
        {!foldedSections.income_expense && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '支出', value: fmtStat(totalExpense) },
              { label: '收入', value: fmtStat(totalIncome) },
              { label: '结余', value: fmtStat(balance) },
              { label: '日均支出', value: fmtStat(dailyAvgExpense) },
              { label: '退款', value: fmtStat(0) },
              { label: '退款收入', value: fmtStat(0) },
              { label: '优惠', value: fmtStat(0) },
              { label: '手续费', value: fmtStat(0) },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-text-secondary">{item.label}</span>
                <span className="text-sm font-medium text-text tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 报销统计 */}
      <div className="mx-4 mt-4">
        <button
          onClick={() => toggleSection('reimbursement')}
          className="w-full flex items-center gap-2 mb-2"
        >
          <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-amber-600 text-xs">↰</span>
          </span>
          <span className="text-sm font-semibold text-text">报销统计</span>
          <ChevronDown
            size={16}
            className={`text-text-muted transition-transform ${foldedSections.reimbursement ? '' : 'rotate-180'}`}
          />
        </button>
        {!foldedSections.reimbursement && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '待报销', value: fmtStat(0) },
              { label: '已报销', value: fmtStat(0) },
              { label: '报销入账', value: fmtStat(0) },
              { label: '报销收入', value: fmtStat(0) },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-text-secondary">{item.label}</span>
                <span className="text-sm font-medium text-text tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 流转统计 */}
      <div className="mx-4 mt-4">
        <button
          onClick={() => toggleSection('flow')}
          className="w-full flex items-center gap-2 mb-2"
        >
          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500 text-xs">⇄</span>
          </span>
          <span className="text-sm font-semibold text-text">流转统计</span>
          <ChevronDown
            size={16}
            className={`text-text-muted transition-transform ${foldedSections.flow ? '' : 'rotate-180'}`}
          />
        </button>
        {!foldedSections.flow && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '还款', value: fmtStat(0) },
              { label: '收款', value: fmtStat(0) },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-text-secondary">{item.label}</span>
                <span className="text-sm font-medium text-text tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Breakdown Card */}
      <div className="mx-4 mt-3 bg-white rounded-3xl p-4 card-shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-violet-500" />分类统计</h2>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setStatsType('expense')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statsType === 'expense' ? 'bg-white text-gray-700 card-shadow' : 'text-gray-400'
              }`}
            >
              支出
            </button>
            <button
              onClick={() => setStatsType('income')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statsType === 'income' ? 'bg-white text-gray-700 card-shadow' : 'text-gray-400'
              }`}
            >
              收入
            </button>
          </div>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">暂无数据</p>
            <p className="text-xs text-text-muted mt-1">记一笔账单后这里会显示统计</p>
          </div>
        ) : (
          <>
            {/* Pie Chart */}
            {pieData.length > 0 && (
              <div className="flex justify-center mb-4">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Category List */}
            <div className="space-y-2">
              {categoryBreakdown.map((item, idx) => {
                // total removed
                const maxAmount = categoryBreakdown[0]?.amount ?? 1
                const barWidth = (item.amount / maxAmount) * 100
                return (
                  <div key={item.category?.id ?? idx} className="py-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.category?.icon ?? '?'}</span>
                        <span className="text-sm text-gray-700">
                          {item.category?.name ?? '其他'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 tabular-nums">
                          {item.amount.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-400 w-12 text-right tabular-nums">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor:
                            item.category?.color ?? CHART_COLORS[idx % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Member Stats Card */}
      <div className="mx-4 mt-3 bg-white rounded-3xl p-4 card-shadow">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">成员统计</h2>
        {memberBreakdown.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">暂无数据</p>
            <p className="text-xs text-text-muted mt-1">记一笔账单后这里会显示统计</p>
          </div>
        ) : (
          <div className="space-y-3">
            {memberBreakdown.map(({ member, paid, expensePaid, share }) => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-primary"
                  >
                    {getMemberName(member).charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 font-medium">
                      {getMemberName(member)}
                    </p>
                    <p className="text-xs text-gray-400 tabular-nums">
                      支出 {expensePaid.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-700 tabular-nums">
                    {paid.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 tabular-nums">
                    占比 {share.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Relationship Conclusion */}
      <div className="mx-4 mt-3 mb-4 bg-white rounded-3xl p-4 card-shadow">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">关系结论</h2>
        <p className="text-sm text-gray-500 leading-relaxed text-pretty">
          本{period === 'month' ? '月' : period === 'week' ? '周' : period === 'year' ? '年' : '期'}
          共同支出占总支出的{' '}
          <span className="font-semibold tabular-nums text-primary">
            {sharedExpenseRatio.toFixed(1)}%
          </span>
        </p>
        {sharedExpenseRatio > 50 && (
          <p className="text-xs text-gray-400 mt-1">
            共同支出比例较高，体现了良好的共同理财意识
          </p>
        )}
        {sharedExpenseRatio <= 50 && sharedExpenseRatio > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            个人支出偏多，可以考虑增加共同消费记录
          </p>
        )}
        {sharedExpenseRatio === 0 && (
          <p className="text-xs text-gray-400 mt-1">
            暂无共同支出记录，试试将消费标记为"共同"范围
          </p>
        )}
      </div>
    </div>
  )
}
