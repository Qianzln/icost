import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, MoreHorizontal, Crown, Shield, User, ChevronLeft, Heart, Users, Home, Plane, BookOpen } from 'lucide-react'
import { useStore } from '../store'
import type { LedgerMember, MemberRole } from '../types'

const ROLE_CONFIG: Record<MemberRole, { label: string; icon: React.ReactNode; color: string }> = {
  owner: { label: '所有者', icon: <Crown size={14} />, color: '#FFB800' },
  admin: { label: '管理员', icon: <Shield size={14} />, color: '#3A9CFF' },
  member: { label: '成员', icon: <User size={14} />, color: '#888' },
  viewer: { label: '只读', icon: <User size={14} />, color: '#BBB' },
}

const AVATAR_COLORS = ['#3A9CFF', '#F45D55', '#35C77B', '#FF85A1', '#9B59B6', '#FFD700']

export default function Members() {
  const navigate = useNavigate()
  const { members, currentLedger, currentUser, setMembers } = useStore()

  const [showInvite, setShowInvite] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)

  const currentUserId = currentUser?.id ?? ''
  const currentUserMember = useMemo(
    () => members.find(m => m.user_id === currentUserId),
    [members, currentUserId],
  )
  const isOwnerOrAdmin =
    currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'

  const getAvatarColor = (index: number) =>
    AVATAR_COLORS[index % AVATAR_COLORS.length]

  const getDisplayName = (m: LedgerMember) => {
    if (m.user_id === currentUserId) return '我'
    return m.display_name
  }

  const handleRoleChange = (memberId: string, newRole: MemberRole) => {
    const updated = members.map(m =>
      m.id === memberId ? { ...m, role: newRole } : m,
    )
    setMembers(updated)
    setActiveMenu(null)
  }

  const handleRemoveMember = (memberId: string) => {
    const updated = members.filter(m => m.id !== memberId)
    setMembers(updated)
    setShowRemoveConfirm(null)
    setActiveMenu(null)
  }

  const handleCopyInviteLink = () => {
    const link = `https://icost.app/invite/${currentLedger?.id ?? 'demo'}?code=${Date.now().toString(36)}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link)
    }
  }

  return (
    <div className="min-h-dvh pb-24 bg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg pt-12 pb-2 px-4">
        <div className="relative flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100"
          >
            <ChevronLeft size={22} className="text-text-secondary" />
          </button>
          <h1 className="text-lg font-bold text-text flex-1 text-center">
            成员管理
          </h1>
          {isOwnerOrAdmin ? (
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-white active:opacity-70"
            >
              <UserPlus size={14} />
              邀请
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>
      </div>

      {/* Ledger Info */}
      <div className="mx-4 mt-4 bg-white rounded-3xl p-4 card-shadow">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-primary bg-primary/10"
          >
            {currentLedger?.type === 'couple'
              ? <Heart size={22} />
              : currentLedger?.type === 'family'
                ? <Users size={22} />
                : currentLedger?.type === 'roommate'
                  ? <Home size={22} />
                  : currentLedger?.type === 'travel'
                    ? <Plane size={22} />
                    : <BookOpen size={22} />}
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-800">
              {currentLedger?.name ?? '账本'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {members.filter(m => m.status === 'active').length} 位成员
              {currentLedger?.type === 'couple' && ' · 情侣账本'}
              {currentLedger?.type === 'family' && ' · 家庭账本'}
              {currentLedger?.type === 'roommate' && ' · 室友账本'}
            </p>
          </div>
        </div>
      </div>

      {/* Invite Section */}
      {showInvite && (
        <div className="mx-4 mt-3 bg-white rounded-3xl p-4 card-shadow">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">邀请成员</h3>

          {/* Share Link */}
          <div className="bg-gray-50 rounded-2xl p-3 mb-3">
            <p className="text-xs text-gray-400 mb-1">邀请链接</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-600 flex-1 truncate">
                https://icost.app/invite/{currentLedger?.id ?? 'demo'}
              </p>
              <button
                onClick={handleCopyInviteLink}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white active:opacity-70 flex-shrink-0 bg-primary"
              >
                复制
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="mx-4 mt-3">
        <h2 className="text-sm font-semibold text-gray-500 mb-2 px-1 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-pink-400" />成员列表</h2>
        <div className="bg-white rounded-3xl overflow-hidden card-shadow">
          {members
            .filter(m => m.status === 'active')
            .map((member, idx) => {
              const roleCfg = ROLE_CONFIG[member.role]
              const isSelf = member.user_id === currentUserId
              const isOwner = member.role === 'owner'

              return (
                <div
                  key={member.id}
                  className={`relative ${
                    idx < members.filter(m => m.status === 'active').length - 1
                      ? 'border-b border-gray-100'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{
                          backgroundColor: getAvatarColor(idx),
                        }}
                      >
                        {getDisplayName(member).charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">
                            {getDisplayName(member)}
                          </span>
                          {isSelf && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                            >
                              我
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5" style={{ color: roleCfg.color }}>
                          {roleCfg.icon}
                          <span className="text-xs">{roleCfg.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions (only for non-self, non-owner members, and only for owner/admin) */}
                    {isOwnerOrAdmin && !isSelf && !isOwner && (
                      <button
                        onClick={() =>
                          setActiveMenu(activeMenu === member.id ? null : member.id)
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100"
                      >
                        <MoreHorizontal size={18} className="text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Action Menu Dropdown */}
                  {activeMenu === member.id && (
                    <div
                      className="absolute right-4 top-14 z-20 bg-white rounded-2xl shadow-lg py-1 min-w-32"
                      className="border border-divider"
                    >
                      {/* Role options */}
                      {currentUserMember?.role === 'owner' && (
                        <>
                          <p className="px-3 py-1 text-xs text-gray-400">更改角色</p>
                          {(['admin', 'member', 'viewer'] as MemberRole[]).map(role => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(member.id, role)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm active:bg-gray-50 ${
                                member.role === role ? 'text-blue-500 font-medium' : 'text-gray-700'
                              }`}
                            >
                              {ROLE_CONFIG[role].icon}
                              {ROLE_CONFIG[role].label}
                              {member.role === role && (
                                <span className="ml-auto text-xs text-primary">
                                  当前
                                </span>
                              )}
                            </button>
                          ))}
                          <div className="my-1 border-t border-gray-100" />
                        </>
                      )}
                      <button
                        onClick={() => {
                          setShowRemoveConfirm(member.id)
                          setActiveMenu(null)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm active:bg-gray-50 text-expense"
                      >
                        移除成员
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </div>

      {/* Invite Button (bottom) */}
      {isOwnerOrAdmin && !showInvite && (
        <div className="mx-4 mt-6">
          <button
            onClick={() => setShowInvite(true)}
            className="w-full py-3.5 rounded-3xl text-sm font-semibold text-white active:opacity-80 shadow-lg flex items-center justify-center gap-2 bg-primary"
          >
            <UserPlus size={18} />
            邀请成员
          </button>
        </div>
      )}

      {/* Click outside to close menu */}
      {activeMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setActiveMenu(null)}
        />
      )}

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-800 text-center mb-2">
              确认移除
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              确定要移除成员「
              {getDisplayName(
                members.find(m => m.id === showRemoveConfirm) ?? members[0],
              )}
              」吗？移除后该成员将无法访问此账本。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveConfirm(null)}
                className="flex-1 py-3 rounded-3xl text-sm font-medium bg-gray-100 text-gray-600 active:opacity-70"
              >
                取消
              </button>
              <button
                onClick={() => handleRemoveMember(showRemoveConfirm)}
                className="flex-1 py-3 rounded-3xl text-sm font-medium text-white active:opacity-70 bg-expense"
              >
                确认移除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
