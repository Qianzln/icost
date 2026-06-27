import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Clock, ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { useStore } from '../store'
import type { Transaction, Settlement as SettlementType } from '../types'

interface MemberBalance {
  userId: string
  name: string
  totalShouldPay: number
  totalActualPaid: number
  diff: number // actual_paid - should_pay: positive means they overpaid (others owe them)
}

interface UnsettledItem {
  transaction: Transaction
  otherShouldPay: number
  otherActualPaid: number
  otherOwes: number
}

export default function Settlement() {
  const navigate = useNavigate()
  const {
    transactions, settlements, members, currentUser, categories,
    markSettled,
  } = useStore()

  const [showSettleConfirm, setShowSettleConfirm] = useState<string | null>(null)

  const currentUserId = currentUser?.id ?? ''

  // Other members (excluding current user)
  const otherMembers = useMemo(
    () => members.filter(m => m.user_id !== currentUserId && m.status === 'active'),
    [members, currentUserId],
  )

  // Calculate per-member balances from all splits
  const memberBalances: MemberBalance[] = useMemo(() => {
    const balanceMap = new Map<string, { shouldPay: number; actualPaid: number }>()

    // Initialize for all members
    members.forEach(m => {
      balanceMap.set(m.user_id, { shouldPay: 0, actualPaid: 0 })
    })

    // Aggregate from all transactions with splits
    transactions.forEach(tx => {
      if (!tx.splits) return
      tx.splits.forEach(split => {
        split.items.forEach(item => {
          const existing = balanceMap.get(item.user_id)
          if (existing) {
            existing.shouldPay += item.should_pay
            existing.actualPaid += item.actual_paid
          } else {
            balanceMap.set(item.user_id, {
              shouldPay: item.should_pay,
              actualPaid: item.actual_paid,
            })
          }
        })
      })
    })

    return members
      .filter(m => m.user_id !== currentUserId)
      .map(m => {
        const data = balanceMap.get(m.user_id) ?? { shouldPay: 0, actualPaid: 0 }
        return {
          userId: m.user_id,
          name: m.display_name,
          totalShouldPay: data.shouldPay,
          totalActualPaid: data.actualPaid,
          diff: data.actualPaid - data.shouldPay,
        }
      })
  }, [transactions, members, currentUserId])

  // Total balance: positive diff means the other person overpaid, so current user owes them
  // negative diff means the other person underpaid, so they owe current user
  const totalOtherDiff = useMemo(
    () => memberBalances.reduce((sum, mb) => sum + mb.diff, 0),
    [memberBalances],
  )

  // For couple mode, simplify: one "other" person
  const otherBalance = memberBalances[0]

  // Unsettled transactions (with splits involving the other member)
  const unsettledItems: UnsettledItem[] = useMemo(() => {
    const items: UnsettledItem[] = []

    transactions.forEach(tx => {
      if (!tx.splits) return
      tx.splits.forEach(split => {
        const currentItem = split.items.find(i => i.user_id === currentUserId)
        if (!currentItem) return

        otherMembers.forEach(other => {
          const otherItem = split.items.find(i => i.user_id === other.userId)
          if (!otherItem) return

          const otherOwes = otherItem.should_pay - otherItem.actual_paid
          if (Math.abs(otherOwes) < 0.01) return

          items.push({
            transaction: tx,
            otherShouldPay: otherItem.should_pay,
            otherActualPaid: otherItem.actual_paid,
            otherOwes,
          })
        })
      })
    })

    // Sort by date descending
    items.sort(
      (a, b) =>
        new Date(b.transaction.occurred_at).getTime() -
        new Date(a.transaction.occurred_at).getTime(),
    )

    return items
  }, [transactions, currentUserId, otherMembers])

  // Pending settlements
  const pendingSettlements = useMemo(
    () => settlements.filter(s => s.status === 'pending'),
    [settlements],
  )

  // Settled history
  const settledHistory = useMemo(
    () =>
      settlements
        .filter(s => s.status === 'settled')
        .sort(
          (a, b) =>
            new Date(b.settled_at ?? b.created_at).getTime() -
            new Date(a.settled_at ?? a.created_at).getTime(),
        ),
    [settlements],
  )

  const getMemberName = (userId: string) => {
    if (userId === currentUserId) return '我'
    return members.find(m => m.user_id === userId)?.display_name ?? userId
  }

  const getCategoryIcon = (tx: Transaction) => {
    const cat = tx.category ?? categories.find(c => c.id === tx.category_id)
    return cat?.icon ?? '?'
  }

  const handleMarkSettled = (settlementId: string) => {
    markSettled(settlementId)
    setShowSettleConfirm(null)
  }

  const handleCreateAndSettleAll = () => {
    // Create a settlement record for the current balance and mark all pending as settled
    if (pendingSettlements.length > 0) {
      pendingSettlements.forEach(s => markSettled(s.id))
    }
    setShowSettleConfirm(null)
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
            <h1 className="text-lg font-bold text-text">待结算</h1>
            <div className="w-9" />
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="mx-4 mt-3 bg-white rounded-3xl p-6 card-shadow">
        <p className="text-sm text-gray-400 text-center mb-2">结算概览</p>
        {otherBalance ? (
          <>
            {otherBalance.diff < 0 ? (
              // Other person underpaid, they owe you
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">
                  {otherBalance.name}需还你
                </p>
                <p className="text-[36px] font-bold tabular-nums text-primary">
                  {Math.abs(otherBalance.diff).toFixed(2)}
                </p>
              </div>
            ) : otherBalance.diff > 0 ? (
              // Other person overpaid, you owe them
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">
                  你需还{otherBalance.name}
                </p>
                <p className="text-[36px] font-bold tabular-nums text-expense">
                  {otherBalance.diff.toFixed(2)}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">暂无待结算</p>
                <p className="text-[36px] font-bold text-gray-300 tabular-nums">0.00</p>
              </div>
            )}

            {/* Detailed breakdown */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
              <div className="text-center">
                <p>{otherBalance.name}应付</p>
                <p className="text-sm font-medium text-gray-600 tabular-nums">
                  {otherBalance.totalShouldPay.toFixed(2)}
                </p>
              </div>
              <ArrowRight size={14} className="text-gray-300" />
              <div className="text-center">
                <p>{otherBalance.name}实付</p>
                <p className="text-sm font-medium text-gray-600 tabular-nums">
                  {otherBalance.totalActualPaid.toFixed(2)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-center text-gray-400 text-sm">暂无成员数据</p>
            <p className="text-xs text-text-muted mt-1">请先在成员管理中邀请成员</p>
          </div>
        )}
      </div>

      {/* Unsettled Transactions */}
      <div className="mx-4 mt-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-2 px-1 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-amber-500" />未结算明细</h2>
        {unsettledItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center card-shadow">
            <Check size={32} className="mx-auto text-green-400 mb-2" />
            <p className="text-sm text-gray-400">所有账目已结清</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl overflow-hidden card-shadow">
            {unsettledItems.map((item, idx) => (
              <div
                key={item.transaction.id + idx}
                className={`flex items-center justify-between px-4 py-3 ${
                  idx < unsettledItems.length - 1 ? 'border-b border-divider' : ''
                }`}
                onClick={() => navigate(`/transaction/${item.transaction.id}`)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getCategoryIcon(item.transaction)}</span>
                  <div>
                    <p className="text-sm text-gray-700">
                      {item.transaction.note || '未备注'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(item.transaction.occurred_at), 'MM-dd HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700 tabular-nums">
                    {item.transaction.amount.toFixed(2)}
                  </p>
                  <p
                    className={`text-xs font-medium tabular-nums ${item.otherOwes > 0 ? 'text-primary' : 'text-income'}`}
                  >
                    {item.otherOwes > 0 ? '对方应还' : '对方多付'}{' '}
                    {Math.abs(item.otherOwes).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Settlements */}
      {pendingSettlements.length > 0 && (
        <div className="mx-4 mt-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-2 px-1 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-amber-500" />待确认结算</h2>
          <div className="bg-white rounded-3xl overflow-hidden card-shadow">
            {pendingSettlements.map((s, idx) => (
              <div
                key={s.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  idx < pendingSettlements.length - 1 ? 'border-b border-divider' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10"
                  >
                    <Clock size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      {getMemberName(s.from_user_id)}{' '}
                      <ArrowRight size={12} className="inline" />{' '}
                      {getMemberName(s.to_user_id)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(s.created_at), 'MM-dd HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700 tabular-nums">
                    {s.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => setShowSettleConfirm(s.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-white active:opacity-70 bg-income"
                  >
                    确认
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mark Settled Button */}
      {unsettledItems.length > 0 && otherBalance && Math.abs(otherBalance.diff) > 0.01 && (
        <div className="mx-4 mt-6">
          <button
            onClick={() => setShowSettleConfirm('all')}
            className="w-full py-3.5 rounded-3xl text-sm font-semibold text-white active:opacity-80 shadow-lg bg-primary"
          >
            <div className="flex items-center justify-center gap-2">
              <Check size={18} />
              标记已结算
            </div>
          </button>
        </div>
      )}

      {/* Settlement History */}
      {settledHistory.length > 0 && (
        <div className="mx-4 mt-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-2 px-1 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-amber-500" />结算历史</h2>
          <div className="bg-white rounded-3xl overflow-hidden card-shadow">
            {settledHistory.map((s, idx) => (
              <div
                key={s.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  idx < settledHistory.length - 1 ? 'border-b border-divider' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-income/10"
                  >
                    <Check size={16} className="text-income" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      {getMemberName(s.from_user_id)}{' '}
                      <ArrowRight size={12} className="inline" />{' '}
                      {getMemberName(s.to_user_id)}
                    </p>
                    <p className="text-xs text-gray-400">
                      结算于 {format(new Date(s.settled_at ?? s.created_at), 'yyyy-MM-dd HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-500 tabular-nums">
                    {s.amount.toFixed(2)}
                  </span>
                  <p className="text-xs text-green-500">已结清</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settle Confirmation Modal */}
      {showSettleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-800 text-center mb-2">
              确认结算
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {showSettleConfirm === 'all'
                ? `确认与${otherBalance?.name ?? '对方'}的所有待结算项目已结清？金额：${Math.abs(otherBalance?.diff ?? 0).toFixed(2)} 元`
                : '确认此笔结算已完成？'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettleConfirm(null)}
                className="flex-1 py-3 rounded-3xl text-sm font-medium bg-gray-100 text-gray-600 active:opacity-70"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (showSettleConfirm === 'all') {
                    handleCreateAndSettleAll()
                  } else {
                    handleMarkSettled(showSettleConfirm)
                  }
                }}
                className="flex-1 py-3 rounded-3xl text-sm font-medium text-white active:opacity-70 bg-income"
              >
                确认结清
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
