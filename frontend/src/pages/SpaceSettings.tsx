import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { spacesApi, Space } from '../api/items'

export default function SpaceSettings() {
  const { id } = useParams<{ id: string }>()
  const spaceId = id ? parseInt(id) : null
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<number | null>(null)
  const [removeMemberEmail, setRemoveMemberEmail] = useState('')

  const { data: space, isLoading } = useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => (spaceId ? spacesApi.getDetail(spaceId) : Promise.resolve(null)),
    enabled: !!spaceId,
  })

  const createInviteMutation = useMutation({
    mutationFn: () => (spaceId ? spacesApi.createInvite(spaceId) : Promise.reject()),
    onSuccess: (data) => {
      setInviteUrl(`${window.location.origin}/invite/${data.token}`)
      setCopied(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => (spaceId ? spacesApi.deleteSpace(spaceId) : Promise.reject()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['spaces'] })
      const spaces = await queryClient.fetchQuery<Space[]>({ queryKey: ['spaces'] })
      if (spaces && spaces.length > 0) {
        navigate(`/space/${spaces[0].id}/items`)
      } else {
        navigate('/')
      }
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: ({ userId }: { userId: number }) =>
      spaceId ? spacesApi.removeMember(spaceId, userId) : Promise.reject(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['space', spaceId] })
      setRemoveMemberId(null)
      setRemoveMemberEmail('')
    },
  })

  const leaveSpaceMutation = useMutation({
    mutationFn: () => (spaceId ? spacesApi.leaveSpace(spaceId) : Promise.reject()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['spaces'] })
      const spaces = await queryClient.fetchQuery<Space[]>({ queryKey: ['spaces'] })
      if (spaces && spaces.length > 0) {
        navigate(`/space/${spaces[0].id}/items`)
      } else {
        navigate('/')
      }
    },
  })

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return <div className="text-center py-20 text-slate-400">Загрузка...</div>
  if (!space) return <div className="text-center py-20 text-slate-400">Пространство не найдено</div>

  const isOwner = user && space.members.some(m => m.email === user.email && m.role === 'owner')
  const isMember = user && space.members.some(m => m.email === user.email)
  if (!isMember) return <div className="text-center py-20 text-slate-400">Доступ запрещён</div>

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-6">
        <Link to={`/space/${spaceId}/items`} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">{space.name}</h1>
      </div>

      {/* Description */}
      <div className="card p-4 sm:p-6 mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Описание</h2>
        <p className="text-sm sm:text-base text-slate-700">{space.description || 'Нет описания'}</p>
      </div>

      {/* Members */}
      <div className="card p-4 sm:p-6 mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Участники ({space.members.length})
        </h2>
        <div className="space-y-3">
          {space.members.map(member => (
            <div key={member.id} className="flex items-start sm:items-center justify-between py-2.5 border-b border-slate-100 last:border-0 gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-indigo-700">
                    {member.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-slate-900 truncate">{member.email}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  member.role === 'owner'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {member.role === 'owner' ? 'Владелец' : 'Участник'}
                </span>
                {isOwner && user && member.email !== user.email && member.role !== 'owner' && (
                  <button
                    onClick={() => {
                      setRemoveMemberId(member.id)
                      setRemoveMemberEmail(member.email)
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Удалить из пространства"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Owner-only sections: Invites */}
      {isOwner && (
        <div className="card p-4 sm:p-6 mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Приглашения
          </h2>

          {!inviteUrl ? (
            <div>
              <p className="text-sm text-slate-500 mb-4">
                Создайте ссылку, чтобы пригласить кого-то в пространство. Ссылка действует 48 часов.
              </p>
              <button
                onClick={() => createInviteMutation.mutate()}
                disabled={createInviteMutation.isPending}
                className="btn-primary w-full sm:w-auto"
              >
                {createInviteMutation.isPending ? 'Создание...' : 'Создать ссылку-приглашение'}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="input-field text-sm w-full"
                />
                <button
                  onClick={copyInvite}
                  className="btn-secondary shrink-0"
                >
                  {copied ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Срок действия: 48 часов. Отправьте ссылку тому, кого хотите пригласить.
              </p>
              <button
                onClick={() => createInviteMutation.mutate()}
                disabled={createInviteMutation.isPending}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createInviteMutation.isPending ? 'Создание...' : 'Создать новую ссылку'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Danger Zone / Leave Zone */}
      {isOwner ? (
        <div className="card p-4 sm:p-6">
          <h2 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-4">
            Опасная зона
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Удалить пространство</p>
              <p className="text-sm text-slate-500">Все товары и участники будут удалены безвозвратно</p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors shrink-0"
            >
              Удалить
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-4 sm:p-6">
          <h2 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-4">
            Выход из пространства
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Покинуть «{space.name}»</p>
              <p className="text-sm text-slate-500">Вы больше не будете иметь доступ к этому пространству</p>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors shrink-0"
            >
              Покинуть
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative card p-5 sm:p-6 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900">Удалить «{space.name}»?</h3>
                <p className="text-sm text-slate-500">Это действие нельзя отменить</p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove member confirmation modal */}
      {removeMemberId !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setRemoveMemberId(null); setRemoveMemberEmail('') }} />
          <div className="relative card p-5 sm:p-6 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-6a2 2 0 00-2-2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900">Удалить участника?</h3>
                <p className="text-sm text-slate-500 truncate">{removeMemberEmail} будет удалён из «{space.name}»</p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                onClick={() => { setRemoveMemberId(null); setRemoveMemberEmail('') }}
                className="flex-1 btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={() => removeMemberMutation.mutate({ userId: removeMemberId })}
                disabled={removeMemberMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {removeMemberMutation.isPending ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave space confirmation modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLeaveModal(false)} />
          <div className="relative card p-5 sm:p-6 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900">Покинуть «{space.name}»?</h3>
                <p className="text-sm text-slate-500">Вы потеряете доступ к этому пространству и всем его товарам</p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={() => leaveSpaceMutation.mutate()}
                disabled={leaveSpaceMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {leaveSpaceMutation.isPending ? 'Выход...' : 'Покинуть пространство'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
