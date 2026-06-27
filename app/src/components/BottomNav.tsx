import { BookOpen, Wallet, Plus, BarChart3, User } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store'

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const navItems: NavItem[] = [
  { path: '/', label: '账本', icon: BookOpen },
  { path: '/assets', label: '资产', icon: Wallet },
  { path: '/add', label: '记一笔', icon: Plus },
  { path: '/stats', label: '统计', icon: BarChart3 },
  { path: '/profile', label: '我的', icon: User },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const setShowAddTransaction = useStore((s) => s.setShowAddTransaction)
  const showAddTransaction = useStore((s) => s.showAddTransaction)

  const currentPath = location.pathname

  const handleClick = (item: NavItem) => {
    if (item.path === '/add') {
      setShowAddTransaction(true)
      return
    }
    navigate(item.path)
  }

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/'
    return currentPath.startsWith(path)
  }

  if (showAddTransaction) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[70] flex justify-center">
      <div className="w-full max-w-[430px] px-4 pb-4">
        <div className="flex items-center justify-around bg-white rounded-2xl shadow-lg px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            const isCenter = item.path === '/add'

            if (isCenter) {
              return (
                <button
                  key={item.path}
                  onClick={() => handleClick(item)}
                  className="flex flex-col items-center justify-center -mt-5"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4FACFE] to-[#2E8BEF] flex items-center justify-center shadow-lg">
                    <Icon size={28} className="text-white" />
                  </div>
                  <span className="text-[10px] mt-0.5 text-text-muted">
                    {item.label}
                  </span>
                </button>
              )
            }

            return (
              <button
                key={item.path}
                onClick={() => handleClick(item)}
                className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-colors ${
                  active ? 'text-primary' : 'text-text-muted'
                }`}
              >
                <Icon size={22} />
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
