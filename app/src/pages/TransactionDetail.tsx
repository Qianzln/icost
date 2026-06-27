import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Edit3, Trash2, Calendar, Tag, User, CreditCard, Users, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { useStore } from '../store'
import type { Category } from '../types'

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    transactions, categories, accounts, members,
    updateTransaction, deleteTransaction, currentUser,
  } = useStore()

  const transaction = useMemo(
    () => transactions.find(t => t.id === id) ?? null,
    [transactions, id],
  )

  const [editing, setEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Edit form state
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editAccountId, setEditAccountId] = useState('')
  const [editScope, setEditScope] = useState<'personal' | 'shared'>('personal')
  const [editTags, setEditTags] = useState('')

  const startEditing = () => {
    if (!transaction) return
    setEditAmount(String(transaction.amount))
    setEditNote(transaction.note ?? '')
    setEditCategoryId(transaction.category_id)
    setEditAccountId(transaction.account_id ?? '')
    setEditScope(transaction.scope)
    setEditTags((transaction.tags ?? []).join(', '))
    setEditing(true)
  }

  const saveEdit = () => {
    if (!transaction) return
    const parsed = parseFloat(editAmount)
    if (isNaN(parsed) || parsed <= 0) return
    updateTransaction(transaction.id, {
      amount: parsed,
      note: editNote || undefined,
      category_id: editCategoryId,
      account_id: editAccountId || undefined,
      scope: editScope,
      tags: editTags
        ? editTags.split(',').map(t => t.trim()).filter(Boolean)
        : undefined,
      updated_at: new Date().toISOString(),
    })
    setEditing(false)
  }

  const handleDelete = () => {
    if (!transaction) return
    deleteTransaction(transaction.id)
    navigate(-1)
  }

  const getCategory = (catId: string): Category | undefined =>
    categories.find(c => c.id === catId)

  const getAccountName = (accId?: string) =>
    accounts.find(a => a.id === accId)?.name ?? '--'

  const getPayerName = (payerId?: string) => {
    if (!payerId) return '--'
    if (payerId === currentUser?.id) return '我'
    return members.find(m => m.user_id === payerId)?.display_name ?? '--'
  }

  const getMemberName = (userId: string) => {
    if (userId === currentUser?.id) return '我'
    return members.find(m => m.user_id === userId)?.display_name ?? userId
  }

  const scopeLabel = (s: string) => (s === 'shared' ? '共同' : '个人')
  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      expense: '支出',
      income: '收入',
      transfer: '转账',
      reimbursement: '报销',
      borrow_in: '借入',
      borrow_out: '借出',
    }
    return map[t] ?? t
  }

  if (!transaction) {
    return (
      <div className="min-h-dvh bg-bg">
        <div className="flex items-center justify-center h-dvh">
          <p className="text-gray-400 text-base">找不到该交易记录</p>
        </div>
      </div>
    )
  }

  const cat = getCategory(transaction.category_id)
  const isExpense = transaction.type === 'expense'

  return (
    <div className="min-h-dvh pb-24 bg-bg">
      {/* Header */}
      <div className="relative px-4 pt-12 pb-3">
        <div className="relative z-10 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-text-secondary active:opacity-60"
          >
            <ChevronLeft size={22} />
            <span className="text-sm">返回</span>
          </button>
          <h1 className="text-base font-semibold text-text">交易详情</h1>
          <div className="flex items-center gap-3">
            {!editing && (
              <button onClick={startEditing} className="text-text-secondary active:opacity-60">
                <Edit3 size={20} />
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="active:opacity-60 text-text-secondary"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Amount Card */}
      <div className="mx-4 mt-4 bg-white rounded-3xl p-6 text-center card-shadow">
        <p className="text-sm text-gray-400 mb-1">{typeLabel(transaction.type)}</p>
        {editing ? (
          <input
            type="number"
            value={editAmount}
            onChange={e => setEditAmount(e.target.value)}
            className={`text-4xl font-bold text-center w-full outline-none border-b-2 border-primary pb-1 ${
              isExpense ? 'text-expense' : transaction.type === 'income' ? 'text-income' : 'text-text'
            }`}
          />
        ) : (
          <p className={`text-4xl font-bold tabular-nums ${
            isExpense ? 'text-expense' : transaction.type === 'income' ? 'text-income' : 'text-text'
          }`}>
            {isExpense ? '-' : transaction.type === 'income' ? '+' : ''}
            {transaction.amount.toFixed(2)}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">{transaction.currency}</p>
      </div>

      {/* Detail Fields */}
      <div className="mx-4 mt-3 bg-white rounded-3xl overflow-hidden card-shadow">
        {/* Category */}
        <FieldRow icon={<span className="text-lg">{cat?.icon ?? '?'}</span>} label="分类">
          {editing ? (
            <select
              value={editCategoryId}
              onChange={e => setEditCategoryId(e.target.value)}
              className="text-sm text-right text-gray-700 outline-none bg-transparent"
            >
              {categories
                .filter(c => c.type === (isExpense ? 'expense' : 'income'))
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
            </select>
          ) : (
            <span className="text-sm text-gray-700">{cat?.name ?? '--'}</span>
          )}
        </FieldRow>

        {/* Account */}
        <FieldRow icon={<CreditCard size={18} className="text-gray-400" />} label="账户">
          {editing ? (
            <select
              value={editAccountId}
              onChange={e => setEditAccountId(e.target.value)}
              className="text-sm text-right text-gray-700 outline-none bg-transparent"
            >
              <option value="">--</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-gray-700">{getAccountName(transaction.account_id)}</span>
          )}
        </FieldRow>

        {/* Payer */}
        <FieldRow icon={<User size={18} className="text-gray-400" />} label="付款人">
          <span className="text-sm text-gray-700">{getPayerName(transaction.payer_user_id)}</span>
        </FieldRow>

        {/* Scope */}
        <FieldRow icon={<Users size={16} className="text-text-muted" />} label="范围">
          {editing ? (
            <select
              value={editScope}
              onChange={e => setEditScope(e.target.value as 'personal' | 'shared')}
              className="text-sm text-right text-gray-700 outline-none bg-transparent"
            >
              <option value="personal">个人</option>
              <option value="shared">共同</option>
            </select>
          ) : (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              transaction.scope === 'shared' ? 'bg-primary/10 text-primary' : 'bg-bg text-text-muted'
            }`}>
              {scopeLabel(transaction.scope)}
            </span>
          )}
        </FieldRow>

        {/* Time */}
        <FieldRow icon={<Calendar size={18} className="text-gray-400" />} label="时间">
          <span className="text-sm text-gray-700">
            {format(new Date(transaction.occurred_at), 'yyyy-MM-dd HH:mm')}
          </span>
        </FieldRow>

        {/* Note */}
        <FieldRow icon={<FileText size={16} className="text-text-muted" />} label="备注">
          {editing ? (
            <input
              type="text"
              value={editNote}
              onChange={e => setEditNote(e.target.value)}
              placeholder="添加备注..."
              className="text-sm text-right text-gray-700 outline-none bg-transparent w-40"
            />
          ) : (
            <span className="text-sm text-gray-500">{transaction.note || '--'}</span>
          )}
        </FieldRow>

        {/* Tags */}
        <FieldRow icon={<Tag size={18} className="text-gray-400" />} label="标签" isLast>
          {editing ? (
            <input
              type="text"
              value={editTags}
              onChange={e => setEditTags(e.target.value)}
              placeholder="逗号分隔..."
              className="text-sm text-right text-gray-700 outline-none bg-transparent w-40"
            />
          ) : transaction.tags && transaction.tags.length > 0 ? (
            <div className="flex gap-1 flex-wrap justify-end">
              {transaction.tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-400">--</span>
          )}
        </FieldRow>
      </div>

      {/* Splits Section */}
      {transaction.splits && transaction.splits.length > 0 && (
        <div className="mx-4 mt-3 bg-white rounded-3xl p-4 card-shadow">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">分账明细</h3>
          {transaction.splits.map(split => (
            <div key={split.id} className="mb-2">
              <p className="text-xs text-gray-400 mb-2">
                分账方式：
                {split.method === 'equal'
                  ? '均分'
                  : split.method === 'ratio'
                    ? '按比例'
                    : split.method === 'custom'
                      ? '自定义'
                      : split.method === 'single'
                        ? '独自承担'
                        : split.method}
              </p>
              <div className="space-y-2">
                {split.items.map((item, idx) => {
                  const diff = item.actual_paid - item.should_pay
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-50 rounded-2xl px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-primary">
                          {getMemberName(item.user_id).charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700">
                          {getMemberName(item.user_id)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">
                          应付 <span className="text-gray-600 tabular-nums">{item.should_pay.toFixed(2)}</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          实付{' '}
                          <span className="font-medium text-text tabular-nums">
                            {item.actual_paid.toFixed(2)}
                          </span>
                        </p>
                        {diff !== 0 && (
                          <p className={`text-xs font-medium tabular-nums ${diff > 0 ? 'text-income' : 'text-expense'}`}>
                            {diff > 0 ? '+' : ''}
                            {diff.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Buttons */}
      {editing && (
        <div className="mx-4 mt-4 flex gap-3">
          <button
            onClick={() => setEditing(false)}
            className="flex-1 py-3 rounded-3xl text-sm font-medium bg-gray-100 text-gray-600 active:opacity-70"
          >
            取消
          </button>
          <button
            onClick={saveEdit}
            className="flex-1 py-3 rounded-3xl text-sm font-medium text-white active:opacity-70 bg-primary"
          >
            保存
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-800 text-center mb-2">
              确认删除
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              删除后无法恢复，确定要删除这条记录吗？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-3xl text-sm font-medium bg-gray-100 text-gray-600 active:opacity-70"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-3xl text-sm font-medium text-white active:opacity-70 bg-expense"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Helper Components ---------- */

function FieldRow({
  icon,
  label,
  children,
  isLast = false,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  isLast?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${!isLast ? 'border-b border-divider' : ''}`}
    >
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}
