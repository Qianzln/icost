import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Sparkles, Wallet, User, CheckCircle, LogIn, UserPlus } from 'lucide-react'
import { useStore } from '../store'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Profile } from '../types'

const DEMO_PROFILE: Profile = {
  id: 'user_001',
  nickname: '我',
  avatar_url: '',
  phone: '13800000000',
  created_at: '2026-06-01T00:00:00Z',
}

export default function Login() {
  const navigate = useNavigate()
  const { login, loginRemote, registerRemote } = useStore()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAuth = useCallback(async () => {
    setError('')
    setSuccess('')
    if (!email || !password) return
    if (mode === 'register' && !nickname) return

    setLoading(true)
    try {
      if (mode === 'login') {
        await loginRemote(email, password)
        navigate('/', { replace: true })
      } else {
        await registerRemote(email, password, nickname)
        setSuccess('注册成功！正在登录...')
        setTimeout(() => navigate('/', { replace: true }), 800)
      }
    } catch (e: any) {
      const msg = e?.message || '操作失败'
      if (msg.includes('Invalid login credentials')) {
        setError('邮箱或密码错误')
      } else if (msg.includes('User already registered')) {
        setError('该邮箱已注册，请直接登录')
      } else if (msg.includes('email')) {
        setError('请输入有效的邮箱地址')
      } else if (msg.includes('Password')) {
        setError('密码至少6位')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [email, password, nickname, mode, loginRemote, registerRemote, navigate])

  const handleDemoLogin = useCallback(async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 300))
    login(DEMO_PROFILE)
    setLoading(false)
    navigate('/', { replace: true })
  }, [login, navigate])

  const canSubmit = email.includes('@') && password.length >= 6 && !loading
    && (mode === 'login' || nickname.length > 0)

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Hero */}
      <div className="relative bg-primary overflow-hidden px-8 pt-20 pb-14">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute bottom-0 -left-10 w-32 h-32 rounded-full bg-white/8 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-white shadow-lg flex items-center justify-center mb-5 rotate-3">
            <Wallet size={40} className="text-primary" />
          </div>
          <h1 className="text-white text-[26px] font-extrabold tracking-wide mb-2">
            小家账本
          </h1>
          <p className="text-white/70 text-sm tracking-wider">
            记录共同生活的每一笔
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-8 pt-8 pb-8 flex flex-col">
        {isSupabaseConfigured ? (
          <>
            {/* Mode toggle */}
            <div className="flex gap-3 mb-8 shrink-0">
              <button
                onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                className="flex-1 flex items-center justify-center gap-2.5 py-5 rounded-2xl text-[15px] font-semibold transition-all"
                style={mode === 'login'
                  ? { backgroundColor: '#3A9CFF', color: '#fff', boxShadow: '0 4px 12px rgba(58,156,255,0.25)' }
                  : { backgroundColor: '#F5F5F7', color: '#666' }
                }
              >
                <LogIn size={20} />
                <span>登录</span>
              </button>
              <button
                onClick={() => { setMode('register'); setError(''); setSuccess('') }}
                className="flex-1 flex items-center justify-center gap-2.5 py-5 rounded-2xl text-[15px] font-semibold transition-all"
                style={mode === 'register'
                  ? { backgroundColor: '#3A9CFF', color: '#fff', boxShadow: '0 4px 12px rgba(58,156,255,0.25)' }
                  : { backgroundColor: '#F5F5F7', color: '#666' }
                }
              >
                <UserPlus size={20} />
                <span>注册</span>
              </button>
            </div>

            {/* Email */}
            <div className="mb-4 shrink-0">
              <label className="text-text-secondary text-xs font-medium mb-2 block">邮箱</label>
              <div className="flex items-center gap-3 bg-bg rounded-2xl px-4 py-3.5 border-2 border-transparent focus-within:border-primary/30 transition-colors">
                <Mail className="w-5 h-5 text-text-muted shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 bg-transparent text-text text-[15px] placeholder:text-text-muted outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-4 shrink-0">
              <label className="text-text-secondary text-xs font-medium mb-2 block">密码</label>
              <div className="flex items-center gap-3 bg-bg rounded-2xl px-4 py-3.5 border-2 border-transparent focus-within:border-primary/30 transition-colors">
                <Lock className="w-5 h-5 text-text-muted shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少6位"
                  className="flex-1 bg-transparent text-text text-[15px] placeholder:text-text-muted outline-none"
                />
              </div>
            </div>

            {/* Nickname (register only) */}
            {mode === 'register' && (
              <div className="mb-4 shrink-0">
                <label className="text-text-secondary text-xs font-medium mb-2 block">昵称</label>
                <div className="flex items-center gap-3 bg-bg rounded-2xl px-4 py-3.5 border-2 border-transparent focus-within:border-primary/30 transition-colors">
                  <User className="w-5 h-5 text-text-muted shrink-0" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.slice(0, 12))}
                    placeholder="你的名字"
                    className="flex-1 bg-transparent text-text text-[15px] placeholder:text-text-muted outline-none"
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-red-500 text-xs text-center mb-3 shrink-0">{error}</p>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-center justify-center gap-2 text-green-500 text-sm mb-3 shrink-0">
                <CheckCircle className="w-4 h-4" />
                <span>{success}</span>
              </div>
            )}

            {/* Submit */}
            <div className="space-y-4 mt-6 shrink-0">
              <button
                onClick={handleAuth}
                disabled={!canSubmit}
                className="w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={canSubmit
                  ? { backgroundColor: '#3A9CFF', color: '#fff', boxShadow: '0 4px 16px rgba(58,156,255,0.35)' }
                  : { backgroundColor: '#E5E5E5', color: '#999' }
                }
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? '登录' : '注册'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Demo mode */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary-tint flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <p className="text-text-secondary text-sm mb-6">
              未配置 Supabase，请以演示模式体验
            </p>
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="px-8 py-3.5 rounded-full text-sm font-semibold bg-primary text-white active:scale-[0.98] transition-all"
            >
              进入演示模式
            </button>
            <p className="text-text-muted text-xs mt-4 max-w-[260px]">
              配置 .env 文件后可开启在线同步功能
            </p>
          </div>
        )}

        {/* Legal footer */}
        <p className="text-center text-text-muted text-[11px] pt-4 leading-relaxed shrink-0">
          登录即表示同意
          <button type="button" className="text-primary underline-offset-2 hover:underline">用户协议</button>
          和
          <button type="button" className="text-primary underline-offset-2 hover:underline">隐私政策</button>
        </p>
      </div>
    </div>
  )
}
