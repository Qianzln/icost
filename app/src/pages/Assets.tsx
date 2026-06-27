import { Wallet, CreditCard, TrendingUp, TrendingDown, ChevronLeft, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function Assets() {
  const navigate = useNavigate()
  const { accounts } = useStore()

  const totalAssets = accounts
    .filter((a) => a.type === 'asset')
    .reduce((s, a) => s + a.balance, 0)

  const totalLiabilities = accounts
    .filter((a) => a.type === 'liability' || a.type === 'credit')
    .reduce((s, a) => s + Math.abs(a.balance), 0)

  const totalBorrowIn = accounts
    .filter((a) => a.type === 'liability')
    .reduce((s, a) => s + Math.abs(a.balance), 0)
  const totalBorrowOut = accounts
    .filter((a) => a.type === 'credit')
    .reduce((s, a) => s + Math.abs(a.balance), 0)

  const netWorth = totalAssets - totalLiabilities

  const fmtAmount = (n: number) =>
    n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="min-h-dvh pb-28 bg-bg">
      {/* Header */}
      <div className="px-5 pt-12 pb-2">

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate('/')} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-100">
              <ChevronLeft size={20} className="text-text-secondary" />
            </button>
            <h1 className="text-lg font-bold text-text">资产</h1>
            <div className="w-9" />
          </div>


        </div>
      </div>


      {/* Net Worth Card */}
      <div className="mx-4 mt-3 bg-white rounded-3xl p-6 text-center card-shadow">
        <p className="text-text-muted text-[11px] tracking-wider uppercase mb-1">净资产</p>
        <p className="text-text text-[40px] font-bold tabular-nums">¥{fmtAmount(netWorth)}</p>
        <p className="text-text-muted text-xs mt-2">
          总资产 ¥{fmtAmount(totalAssets)}　总负债 ¥{fmtAmount(totalLiabilities)}
        </p>
      </div>

      {/* 总借入 / 总借出 */}
      <div className="grid grid-cols-2 gap-3 mx-4 mt-3">
        <div className="bg-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
            <ArrowDownLeft size={18} className="text-gray-500" />
          </div>
          <div>
            <p className="text-text-muted text-xs">总借入</p>
            <p className="text-text text-lg font-bold tabular-nums">
              ¥{fmtAmount(totalBorrowIn)}
            </p>
          </div>
        </div>
        <div className="bg-income-tint rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-income/10 flex items-center justify-center">
            <ArrowUpRight size={18} className="text-income" />
          </div>
          <div>
            <p className="text-text-muted text-xs">总借出</p>
            <p className="text-income text-lg font-bold tabular-nums">
              ¥{fmtAmount(totalBorrowOut)}
            </p>
          </div>
        </div>
      </div>

      {/* Bento Overview Cards */}
      <div className="grid grid-cols-2 gap-3 mx-4 mt-3">
        <div className="bg-income-tint rounded-3xl p-5 card-shadow">
          <p className="text-text-muted text-xs font-medium mb-1.5">总资产</p>
          <p className="text-income text-[20px] font-bold tabular-nums">¥{fmtAmount(totalAssets)}</p>
        </div>
        <div className="bg-expense-tint rounded-3xl p-5 card-shadow">
          <p className="text-text-muted text-xs font-medium mb-1.5">总负债</p>
          <p className="text-expense text-[20px] font-bold tabular-nums">¥{fmtAmount(totalLiabilities)}</p>
        </div>
      </div>

      {/* Account List */}
      <div className="mx-4 mt-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-2 px-1 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-emerald-500" />账户列表</h2>
        <div className="bg-white rounded-3xl overflow-hidden card-shadow">
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">暂无账户</p>
              <p className="text-xs text-text-muted mt-1">添加账户来管理你的资产</p>
              <button className="mt-3 px-4 py-2 rounded-full text-sm font-medium text-white bg-primary active:opacity-80">
                添加账户
              </button>
            </div>
          ) : (
            accounts.map((acc, idx) => (
              <div
                key={acc.id}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  idx < accounts.length - 1 ? 'border-b border-divider' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary-light">
                    {acc.type === 'liability' ? (
                      <CreditCard size={18} className="text-expense" />
                    ) : (
                      <Wallet size={18} className="text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{acc.name}</p>
                    <p className="text-xs text-gray-400">
                      {acc.owner_type === 'shared'
                        ? '共同账户'
                        : acc.owner_type === 'partner'
                          ? '对方账户'
                          : '我的账户'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${acc.type === 'liability' ? 'text-expense' : 'text-text'}`}
                >
                  {acc.type === 'liability' ? '-' : ''}¥{fmtAmount(Math.abs(acc.balance))}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
