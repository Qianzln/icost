import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Lock, Download, Upload, Clock,
  Grid3X3, Tag, FileText, BarChart3, BookOpen, Database,
  LogOut, ChevronRight, ChevronLeft, X, Plus, Trash2,
  Copy, Check, Users, Shield, Pencil, Gift, Camera, Eye, CreditCard,
  ArrowRightLeft, DollarSign, ClipboardList, RotateCcw, PiggyBank, ToggleLeft,
} from 'lucide-react'
import { useStore } from '../store'
import type { Category, Tag as TagType } from '../types'

type PanelKey =
  | 'profile'
  | 'password'
  | 'import'
  | 'export'
  | 'cycleMgmt'
  | 'categoryMgr'
  | 'tagMgr'
  | 'budget'
  | 'assetSettings'
  | 'statsSettings'
  | 'multiLedger'
  | 'backup'
  | 'dataMgmt'
  | 'vipPurchase'
  | 'screenshotImport'
  | 'smartAccounting'
  | 'installment'
  | 'reimbursementSettings'
  | 'currency'
  | 'templateSettings'
  | 'refundSettings'
  | 'savings'
  | 'billImages'
  | 'timeSettings'
  | null

export default function Settings() {
  const navigate = useNavigate()
  const store = useStore()
  const {
    currentUser, logout, updateNickname,
    categories, setCategories,
    currentLedger, ledgers, createLedger, joinLedgerByCode, setLedger,
    tags, addTag, deleteTag,
    accounts,
    monthlyBudget, setMonthlyBudget,
    clearTransactions, deleteTransactionsByFilter, resetLedger,
    transactions,
  } = store

  const [activePanel, setActivePanel] = useState<PanelKey>(null)

  // Shared panel state
  const [editingNickname, setEditingNickname] = useState(false)
  const [nickValue, setNickValue] = useState(currentUser?.nickname ?? '')
  const [passwordEnabled, setPasswordEnabled] = useState(false)
  const [multiLedgerEnabled, setMultiLedgerEnabled] = useState(true)
  const [savingsEnabled, setSavingsEnabled] = useState(false)
  const [catFilter, setCatFilter] = useState<'expense' | 'income'>('expense')
  const [catEditId, setCatEditId] = useState<string | null>(null)
  const [catEditName, setCatEditName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3A9CFF')
  const [budgetInput, setBudgetInput] = useState(String(monthlyBudget))
  const [newLedgerName, setNewLedgerName] = useState('')
  const [newLedgerType, setNewLedgerType] = useState<'couple' | 'family' | 'roommate'>('couple')
  const [joinCode, setJoinCode] = useState('')
  const [joinMsg, setJoinMsg] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const [exportMsg, setExportMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Handlers ──

  const handleLogout = () => { logout(); navigate('/') }

  const saveNickname = () => {
    if (nickValue.trim()) updateNickname(nickValue.trim())
    setEditingNickname(false)
  }

  const filteredCategories = categories.filter(c => c.type === catFilter)

  const startEditCategory = (cat: Category) => {
    setCatEditId(cat.id)
    setCatEditName(cat.name)
  }

  const saveCategoryName = () => {
    if (!catEditId || !catEditName.trim()) { setCatEditId(null); return }
    setCategories(categories.map(c => c.id === catEditId ? { ...c, name: catEditName.trim() } : c))
    setCatEditId(null)
    setCatEditName('')
  }

  const handleAddTag = () => {
    if (!newTagName.trim()) return
    addTag(newTagName.trim(), newTagColor)
    setNewTagName('')
  }

  const handleSaveBudget = () => {
    const val = parseFloat(budgetInput)
    if (!isNaN(val) && val >= 0) setMonthlyBudget(val)
    setActivePanel(null)
  }

  const handleCreateLedger = () => {
    if (!newLedgerName.trim()) return
    createLedger(newLedgerName.trim(), newLedgerType)
    setNewLedgerName('')
  }

  const handleJoinLedger = () => {
    if (!joinCode.trim()) return
    const ok = joinLedgerByCode(joinCode.trim())
    setJoinMsg(ok ? '加入成功！' : '邀请码无效，请检查后重试')
    if (ok) setTimeout(() => { setJoinMsg(''); setActivePanel(null) }, 1200)
  }

  const copyInviteCode = () => {
    if (!currentLedger?.invite_code) return
    navigator.clipboard?.writeText(currentLedger.invite_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const handleExportCSV = () => {
    const headers = '日期,类型,分类,金额,备注,付款人\n'
    const rows = transactions.map(t => {
      const cat = t.category ?? categories.find(c => c.id === t.category_id)
      return `${t.occurred_at.slice(0, 10)},${t.type === 'expense' ? '支出' : '收入'},${cat?.name ?? ''},${t.amount},${t.note ?? ''},${t.payer?.display_name ?? ''}`
    }).join('\n')
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `小家账本_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportMsg('导出成功')
    setTimeout(() => setExportMsg(''), 2000)
  }

  const handleBackupExport = () => {
    const data = { transactions, categories, accounts, tags, ledgers, members: store.members }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `小家账本_备份_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.transactions) store.setTransactions(data.transactions)
        if (data.categories) setCategories(data.categories)
        if (data.accounts) store.setAccounts(data.accounts)
        if (data.tags) store.setTags(data.tags)
        setExportMsg('恢复成功')
      } catch {
        setExportMsg('文件格式错误')
      }
      setTimeout(() => setExportMsg(''), 2000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Panel renderer ──

  const renderPanelHeader = (title: string) => (
    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white rounded-b-2xl card-shadow">
      <button onClick={() => setActivePanel(null)} className="flex items-center gap-1 text-gray-500 active:opacity-60">
        <ChevronLeft size={22} />
        <span className="text-sm">返回</span>
      </button>
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      <div className="w-16" />
    </div>
  )

  // ── Panels ──

  if (activePanel === 'profile') {
    return (
      <div className="min-h-dvh pb-8 bg-bg">
        {renderPanelHeader('个人资料')}
        <div className="mx-4 mt-4 bg-white rounded-3xl p-5 card-shadow">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold bg-gradient-header">
              {currentUser?.nickname?.charAt(0) ?? '我'}
            </div>
            <div className="flex-1">
              {editingNickname ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nickValue}
                    onChange={e => setNickValue(e.target.value)}
                    autoFocus
                    maxLength={12}
                    className="text-lg font-bold text-gray-800 border-b-2 border-primary outline-none w-full py-1"
                    onKeyDown={e => e.key === 'Enter' && saveNickname()}
                  />
                  <button onClick={saveNickname} className="p-1.5 rounded-full bg-primary text-white">
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={() => { setNickValue(currentUser?.nickname ?? ''); setEditingNickname(true) }}
                  className="flex items-center gap-2 text-lg font-bold text-gray-800">
                  {currentUser?.nickname ?? '我'}
                  <Pencil size={14} className="text-gray-400" />
                </button>
              )}
              <p className="text-sm text-gray-400 mt-1">
                {currentUser?.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') ?? '未绑定手机'}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400">点击昵称即可修改，最多12个字符</p>
        </div>
      </div>
    )
  }

  if (activePanel === 'password') {
    return (
      <div className="min-h-dvh pb-8 bg-bg">
        {renderPanelHeader('密码保护')}
        <div className="mx-4 mt-4 bg-white rounded-3xl p-5 card-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-gray-500" />
              <span className="text-sm text-gray-700">启动密码保护</span>
            </div>
            <button
              onClick={() => setPasswordEnabled(v => !v)}
              className={`w-12 h-7 rounded-full transition-colors ${passwordEnabled ? 'bg-primary' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${passwordEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {passwordEnabled ? '已开启，每次打开应用需要验证' : '开启后每次打开应用需要输入密码'}
          </p>
        </div>
      </div>
    )
  }

  if (activePanel === 'export') {
    return (
      <div className="min-h-dvh pb-8 bg-bg">
        {renderPanelHeader('账单导出')}
        <div className="mx-4 mt-4 bg-white rounded-3xl p-5 card-shadow space-y-4">
          <p className="text-sm text-gray-600">将当前账本的所有账单记录导出为 CSV 文件，可用 Excel 打开。</p>
          <p className="text-xs text-gray-400">共 {transactions.length} 条记录</p>
          <button onClick={handleExportCSV}
            className="w-full py-3 rounded-3xl text-sm font-medium text-white active:opacity-80 bg-primary">
            导出 CSV 文件
          </button>
          {exportMsg && <p className="text-sm text-income text-center">{exportMsg}</p>}
        </div>
      </div>
    )
  }

  if (activePanel === 'import') {
    return (
      <div className="min-h-dvh pb-8 bg-bg">
        {renderPanelHeader('账单导入')}
        <div className="mx-4 mt-4 bg-white rounded-3xl p-5 card-shadow space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mx-auto">
            <Upload size={28} className="text-primary" />
          </div>
          <p className="text-sm text-gray-600 text-center">
            支持导入 CSV 格式的账单文件。文件格式需包含：日期、类型、分类、金额、备注。
          </p>
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="text-xs text-gray-400 mb-1">示例格式：</p>
            <p className="text-xs text-gray-500 font-mono">2026-06-26,支出,餐饮,58,午餐</p>
          </div>
          <p className="text-xs text-gray-400 text-center">此功能将在后续版本中完善，当前可使用备份恢复功能替代</p>
        </div>
      </div>
    )
  }

  if (activePanel === 'cycleMgmt') {
    return (
      <div className="min-h-dvh pb-8 bg-bg">
        {renderPanelHeader('周期管理')}
        <div className="mx-4 mt-4 bg-white rounded-3xl p-5 card-shadow space-y-4">
          <p className="text-sm text-gray-600">设置周期性账单（如房租、订阅费），到期自动提醒记账。</p>
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Clock size={28} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">暂无周期账单</p>
            <p className="text-xs text-gray-300 mt-1">此功能将在后续版本中完善</p>
          </div>
        </div>
      </div>
    )
  }

  if (activePanel === 'categoryMgr') {
    return (
      <div className="min-h-dvh pb-8 bg-bg">
        {renderPanelHeader('分类管理')}
        <div className="mx-4 mt-3 flex bg-white rounded-3xl p-1 card-shadow">
          {(['expense', 'income'] as const).map(type => (
            <button key={type} onClick={() => setCatFilter(type)}
              className={`flex-1 py-2 text-sm font-medium rounded-2xl transition-colors ${catFilter === type ? 'text-white' : 'text-gray-500'}`}
              style={catFilter === type ? { backgroundColor: type === 'expense' ? '#F45D55' : '#35C77B' } : undefined}>
              {type === 'expense' ? '支出分类' : '收入分类'}
            </button>
          ))}
        </div>
        <div className="mx-4 mt-3 bg-white rounded-3xl overflow-hidden card-shadow">
          {filteredCategories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">暂无分类</p>
          ) : filteredCategories.map((cat, idx) => (
            <div key={cat.id} className={`flex items-center justify-between px-4 py-3 ${idx < filteredCategories.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat.icon}</span>
                {catEditId === cat.id ? (
                  <input value={catEditName} onChange={e => setCatEditName(e.target.value)}
                    onBlur={saveCategoryName} onKeyDown={e => e.key === 'Enter' && saveCategoryName()}
                    autoFocus className="text-sm text-gray-700 outline-none border-b-2 border-primary px-1 py-0.5 w-32" />
                ) : (
                  <span className="text-sm text-gray-700">{cat.name}</span>
                )}
                {cat.is_system && <span className="text-xs text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded">系统</span>}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                {catEditId !== cat.id ? (
                  <button onClick={() => startEditCategory(cat)}
                    className="text-xs px-2 py-1 rounded-lg bg-gray-50 text-gray-500 active:opacity-60">编辑</button>
                ) : (
                  <button onClick={saveCategoryName}
                    className="text-xs px-2 py-1 rounded-lg text-white active:opacity-60 bg-primary">保存</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-300 mt-4">共 {filteredCategories.length} 个{catFilter === 'expense' ? '支出' : '收入'}分类</p>
      </div>
    )
  }

  if (activePanel === 'tagMgr') {
    return (
      <div className="min-h-dvh pb-8 bg-bg">
        {renderPanelHeader('标签管理')}
        <div className="mx-4 mt-4 bg-white rounded-3xl p-4 card-shadow">
          <div className="flex gap-2 mb-4">
            <input value={newTagName} onChange={e => setNewTagName(e.target.value)}
              placeholder="新标签名称" maxLength={10}
              className="flex-1 px-3 py-2 rounded-2xl bg-gray-50 text-sm outline-none focus:border-primary" />
            <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" />
            <button onClick={handleAddTag}
              className="px-4 py-2 rounded-2xl text-white text-sm font-medium active:opacity-80 bg-primary">
              <Plus size={18} />
            </button>
          </div>
          {tags.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">暂无标签，上方添加</p>
          ) : (
            <div className="space-y-2">
              {tags.map((tag: TagType) => (
                <div key={tag.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="text-sm text-gray-700">{tag.name}</span>
                  </div>
                  <button onClick={() => deleteTag(tag.id)} className="p-1.5 text-gray-300 active:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (activePanel === 'budget') {
    const totalExpense = transactions
      .filter(t => {
        const d = new Date(t.occurred_at)
        const now = new Date()
        return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((s, t) => s + t.amount, 0)
    const pct = monthlyBudget > 0 ? Math.min((totalExpense / monthlyBudget) * 100, 100) : 0

    return (
      <div className="min-h-dvh pb-8 bg-bg">
        {renderPanelHeader('预算功能')}
        <div className="mx-4 mt-4 bg-white rounded-3xl p-5 card-shadow space-y-5">
          <div>
            <p className="text-xs text-gray-400 mb-1">本月预算</p>
            <div className="flex items-center gap-2">
              <span className="text-lg text-gray-400">¥</span>
              <input value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                type="number" className="text-2xl font-bold text-gray-800 outline-none w-full" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1 tabular-nums">
              <span>已使用 ¥{totalExpense.toFixed(0)}</span>
              <span>预算 ¥{monthlyBudget}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: pct > 80 ? '#F45D55' : pct > 50 ? '#FFC928' : '#35C77B' }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {pct > 100 ? '已超出预算！' : `剩余 ¥${(monthlyBudget - totalExpense).toFixed(0)}`}
            </p>
          </div>
          <button onClick={handleSaveBudget}
            className="w-full py-3 rounded-3xl text-sm font-medium text-white active:opacity-80 bg-primary">
            保存预算
          </button>
        </div>
      </div>
    )
  }

  if (activePanel === 'assetSettings') {
    return (
      <div className="min-h-dvh pb-8 bg-bg">
        {renderPanelHeader('资产设置')}
        <div className="mx-4 mt-4 bg-white rounded-3xl overflow-hidden card-shadow">
          {accounts.map((acc, idx) => (
            <div key={acc.id} className={`flex items-center justify-between px-4 py-3.5 ${idx < accounts.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white bg-primary">
                  {acc.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{acc.name}</p>
                  <p className="text-xs text-gray-400">{acc.owner_type === 'shared' ? '共同' : '个人'}</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-700 tabular-nums">¥{acc.balance.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-300 text-center mt-4">更多账户管理功能将在后续版本中完善</p>
      </div>
    )
  }

  if (activePanel === 'statsSettings') {
    return (
      <div className="min-h-dvh pb-8 bg-bg">
        {renderPanelHeader('统计设置')}
        <div className="mx-4 mt-4 bg-white rounded-3xl p-5 card-shadow space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">统计起始日</span>
            <span className="text-sm text-gray-400">每月1日</span>
          </div>
          <div className="flex items-center justify-between border-t border-gray-50 pt-4">
            <span className="text-sm text-gray-700">包含转账</span>
            <span className="text-sm text-gray-400">否</span>
          </div>
          <div className="flex items-center justify-between border-t border-gray-50 pt-4">
            <span className="text-sm text-gray-700">显示零支出日</span>
            <span className="text-sm text-gray-400">是</span>
          </div>
          <p className="text-xs text-gray-300">更多统计选项将在后续版本中完善</p>
        </div>
      </div>
    )
  }

  if (activePanel === 'multiLedger') {
    return (
      <div className="min-h-dvh pb-8 bg-bg">
        {renderPanelHeader('多账本')}

        {/* Current ledger invite code */}
        {currentLedger && (
          <div className="mx-4 mt-4 bg-white rounded-3xl p-5 card-shadow">
            <p className="text-xs text-gray-400 mb-2">当前账本邀请码</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold tracking-widest text-primary">{currentLedger.invite_code ?? '------'}</span>
              </div>
              <button onClick={copyInviteCode}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-light text-primary text-sm font-medium active:opacity-70">
                {codeCopied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">将邀请码分享给对方，对方在"加入账本"中输入即可共同记账</p>
          </div>
        )}

        {/* Join by code */}
        <div className="mx-4 mt-4 bg-white rounded-3xl p-5 card-shadow">
          <p className="text-sm font-medium text-gray-700 mb-3">加入账本</p>
          <div className="flex gap-2">
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="输入6位邀请码" maxLength={6}
              className="flex-1 px-3 py-2.5 rounded-2xl bg-gray-50 text-sm font-mono tracking-wider outline-none focus:border-primary" />
            <button onClick={handleJoinLedger}
              className="px-5 py-2.5 rounded-2xl text-white text-sm font-medium active:opacity-80 bg-primary">
              加入
            </button>
          </div>
          {joinMsg && <p className={`text-sm mt-2 ${joinMsg.includes('成功') ? 'text-income' : 'text-expense'}`}>{joinMsg}</p>}
        </div>

        {/* Create new ledger */}
        <div className="mx-4 mt-4 bg-white rounded-3xl p-5 card-shadow">
          <p className="text-sm font-medium text-gray-700 mb-3">新建账本</p>
          <input value={newLedgerName} onChange={e => setNewLedgerName(e.target.value)}
            placeholder="账本名称" maxLength={20}
            className="w-full px-3 py-2.5 rounded-2xl bg-gray-50 text-sm outline-none focus:border-primary mb-3" />
          <div className="flex gap-2 mb-3">
            {(['couple', 'family', 'roommate'] as const).map(t => (
              <button key={t} onClick={() => setNewLedgerType(t)}
                className={`flex-1 py-2 rounded-2xl text-sm font-medium transition-colors ${newLedgerType === t ? 'text-white bg-primary' : 'text-gray-500 bg-gray-100'}`}>
                {t === 'couple' ? '情侣' : t === 'family' ? '家庭' : '室友'}
              </button>
            ))}
          </div>
          <button onClick={handleCreateLedger} disabled={!newLedgerName.trim()}
            className={`w-full py-3 rounded-3xl text-sm font-medium text-white active:opacity-80 ${newLedgerName.trim() ? 'bg-primary' : 'bg-primary opacity-40'}`}>
            创建账本
          </button>
        </div>

        {/* Ledger list */}
        <div className="mx-4 mt-4">
          <p className="text-xs text-gray-400 mb-2 px-1">所有账本</p>
          <div className="bg-white rounded-3xl overflow-hidden card-shadow">
            {ledgers.map((l, idx) => (
              <button key={l.id} onClick={() => { setLedger(l); setActivePanel(null) }}
                className={`w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 ${idx < ledgers.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-center gap-3">
                  <BookOpen size={20} className="text-text-muted" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-700">{l.name}</p>
                    <p className="text-xs text-gray-400">{l.type === 'couple' ? '情侣' : l.type === 'family' ? '家庭' : l.type === 'roommate' ? '室友' : '个人'}</p>
                  </div>
                </div>
                {l.id === currentLedger?.id && <span className="text-xs text-primary font-medium">当前</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (activePanel === 'backup') {
    return (
      <div className="min-h-dvh pb-8 bg-bg">
        {renderPanelHeader('备份与恢复')}
        <div className="mx-4 mt-4 bg-white rounded-3xl p-5 card-shadow space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">备份数据</p>
            <p className="text-xs text-gray-400 mb-3">将所有账本数据导出为 JSON 文件，可用于恢复。</p>
            <button onClick={handleBackupExport}
              className="w-full py-3 rounded-3xl text-sm font-medium text-white active:opacity-80 bg-primary">
              导出备份文件
            </button>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">恢复数据</p>
            <p className="text-xs text-gray-400 mb-3">从 JSON 备份文件中恢复数据，将覆盖当前数据。</p>
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-3xl text-sm font-medium text-primary bg-primary-light active:opacity-80">
              选择备份文件
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleBackupImport} className="hidden" />
          </div>
          {exportMsg && <p className="text-sm text-income text-center">{exportMsg}</p>}
        </div>
      </div>
    )
  }


  // ── Placeholder panels for new features ──
  const placeholderPanels: Record<string, string> = {
    screenshotImport: '截图导入',
    smartAccounting: '智能记账',
    installment: '分期管理',
    reimbursementSettings: '报销设置',
    currency: '货币和汇率',
    templateSettings: '模板设置',
    refundSettings: '退款设置',
    billImages: '账单图片',
    timeSettings: '时间设置',
  }

  for (const [key, title] of Object.entries(placeholderPanels)) {
    if (activePanel === key) {
      return (
        <div className="min-h-dvh pb-8 bg-bg">
          {renderPanelHeader(title)}
          <div className="mx-4 mt-4 bg-white rounded-3xl p-8 card-shadow text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚧</span>
            </div>
            <p className="text-sm text-gray-500">功能开发中</p>
            <p className="text-xs text-gray-400 mt-1">请关注后续版本更新</p>
          </div>
        </div>
      )
    }
  }

  // ── Main Settings View ──

  // Toggle component
  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className={`w-11 h-6 rounded-full transition-colors relative ${enabled ? 'bg-income' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )

  type MenuItem = {
    icon: React.ReactNode
    label: string
    panel?: PanelKey
    pro?: boolean
    toggle?: { enabled: boolean; onToggle: () => void }
  }

  const menuItems: MenuItem[] = [
    { icon: <Shield size={20} style={{ color: '#3A9CFF' }} />, label: '密码保护', panel: 'password' },
    { icon: <Download size={20} className="text-violet-400" />, label: '账单导入', panel: 'import' },
    { icon: <Upload size={20} className="text-amber-500" />, label: '账单导出', panel: 'export' },
    { icon: <Camera size={20} className="text-orange-400" />, label: '截图导入', panel: 'screenshotImport' },
    { icon: <Eye size={20} className="text-blue-400" />, label: '智能记账', panel: 'smartAccounting' },
    { icon: <Clock size={20} className="text-green-500" />, label: '周期管理', panel: 'cycleMgmt' },
    { icon: <CreditCard size={20} className="text-red-400" />, label: '分期管理', panel: 'installment' },
    { icon: <Grid3X3 size={20} className="text-blue-400" />, label: '分类管理', panel: 'categoryMgr' },
    { icon: <Tag size={20} className="text-violet-400" />, label: '标签管理', panel: 'tagMgr' },
    { icon: <FileText size={20} className="text-orange-400" />, label: '预算功能', panel: 'budget' },
    { icon: <ArrowRightLeft size={20} className="text-gray-600" />, label: '报销设置', panel: 'reimbursementSettings' },
    { icon: <DollarSign size={20} className="text-blue-500" />, label: '货币和汇率', panel: 'currency' },
    { icon: <BarChart3 size={20} className="text-blue-400" />, label: '资产设置', panel: 'assetSettings' },
    { icon: <BookOpen size={20} className="text-blue-400" />, label: '统计设置', panel: 'statsSettings' },
    { icon: <ClipboardList size={20} className="text-red-400" />, label: '模板设置', panel: 'templateSettings' },
    { icon: <RotateCcw size={20} className="text-violet-400" />, label: '退款设置', panel: 'refundSettings' },
    { icon: <Database size={20} className="text-green-500" />, label: '多账本功能', toggle: { enabled: multiLedgerEnabled, onToggle: () => setMultiLedgerEnabled(v => !v) } },
    { icon: <PiggyBank size={20} className="text-green-400" />, label: '存钱功能', toggle: { enabled: savingsEnabled, onToggle: () => setSavingsEnabled(v => !v) } },
    { icon: <Camera size={20} className="text-red-400" />, label: '账单图片', panel: 'billImages' },
    { icon: <Clock size={20} className="text-blue-400" />, label: '时间设置', panel: 'timeSettings' },
    { icon: <Database size={20} className="text-green-500" />, label: '备份与恢复', panel: 'backup' },
    { icon: <Trash2 size={20} className="text-expense" />, label: '数据管理', panel: 'dataMgmt' },
  ]

  return (
    <div className="min-h-dvh pb-24 bg-bg">
      {/* User Profile Card — starts directly, no separate header */}
      <div className="mx-4 mt-14 bg-white rounded-3xl p-5 card-shadow">
        <button onClick={() => { setNickValue(currentUser?.nickname ?? ''); setActivePanel('profile') }}
          className="w-full flex flex-col items-center active:opacity-80">
          <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-gray-200 shrink-0 mb-2">
            <span className="text-gray-400 text-sm">编辑</span>
          </div>
          <p className="text-xs text-gray-400">普通会员</p>
          <h2 className="text-lg font-bold text-gray-800 mt-0.5">{currentUser?.nickname ?? '您的名字'}</h2>
        </button>
      </div>

      {/* Invite code quick access */}
      {currentLedger?.invite_code && (
        <div className="mx-4 mt-3 bg-white rounded-3xl px-5 py-3.5 card-shadow flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <div>
              <p className="text-xs text-gray-400">邀请码</p>
              <p className="text-sm font-bold tracking-wider text-primary">{currentLedger.invite_code}</p>
            </div>
          </div>
          <button onClick={copyInviteCode}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-light text-primary text-xs font-medium active:opacity-70">
            {codeCopied ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制</>}
          </button>
        </div>
      )}

      {/* Menu Items - Grouped */}
      {(() => {
        // Group definitions
        const groups: { title: string; labels: string[] }[] = [
          { title: '数据', labels: ['账单导入', '账单导出', '数据管理'] },
          { title: '记账', labels: ['智能记账', '周期管理', '分期管理', '分类管理', '标签管理', '预算功能', '报销设置'] },
          { title: '资产与统计', labels: ['货币和汇率', '资产设置', '统计设置', '模板设置', '退款设置'] },
          { title: '高级', labels: ['密码保护', '多账本功能', '存钱功能', '账单图片', '时间设置', '截图导入', '备份与恢复'] },
        ]
        return groups.map(group => {
          const items = menuItems.filter(i => group.labels.includes(i.label))
          if (items.length === 0) return null
          return (
            <div key={group.title} className="mx-4 mt-3">
              <h3 className="text-xs font-medium text-gray-400 mb-1.5 px-1">{group.title}</h3>
              <div className="bg-white rounded-3xl overflow-hidden card-shadow">
                {items.map((item, idx) => (
                  <button
                    key={item.label}
                    onClick={() => item.panel && setActivePanel(item.panel)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors ${
                      idx < items.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-2xl bg-gray-50 flex items-center justify-center">{item.icon}</div>
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.toggle ? (
                        <Toggle enabled={item.toggle.enabled} onToggle={item.toggle.onToggle} />
                      ) : (
                        <ChevronRight size={18} className="text-gray-300" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })
      })()}

      {/* Logout */}
      <div className="mx-4 mt-6 mb-8">
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-3xl text-sm font-medium bg-card active:bg-gray-50 card-shadow text-expense">
          <LogOut size={18} />
          退出登录
        </button>
      </div>

      <p className="text-center text-xs text-gray-300 mb-4">小家账本 v1.0.0</p>
    </div>
  )
}
