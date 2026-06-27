import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Login from './pages/Login'
import AddTransaction from './pages/AddTransaction'
import TransactionDetail from './pages/TransactionDetail'
import Settlement from './pages/Settlement'
import Statistics from './pages/Statistics'
import Settings from './pages/Settings'
import Members from './pages/Members'
import Assets from './pages/Assets'

function AppContent() {
  const { isAuthenticated, isLoading, showAddTransaction, setShowAddTransaction, initAuth } = useStore()

  useEffect(() => {
    initAuth()
  }, [initAuth])

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-text-muted">{'\u52a0\u8f7d\u4e2d...'}</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <div className="relative">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/transaction/:id" element={<TransactionDetail />} />
        <Route path="/settlement" element={<Settlement />} />
        <Route path="/stats" element={<Statistics />} />
        <Route path="/profile" element={<Settings />} />
        <Route path="/members" element={<Members />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Add Transaction overlay */}
      {showAddTransaction && (
        <div className="fixed inset-0 z-[60] flex flex-col animate-fadeIn">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowAddTransaction(false)}
          />
          <div className="relative mt-auto animate-slideUp">
            <AddTransaction />
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
