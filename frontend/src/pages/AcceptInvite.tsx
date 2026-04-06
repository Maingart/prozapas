import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { spacesApi } from '../api/items'

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [result, setResult] = useState<{ success: boolean; spaceName?: string; spaceId?: number; error?: string } | null>(null)

  const joinMutation = useMutation({
    mutationFn: () => (token ? spacesApi.acceptInvite(token) : Promise.reject()),
    onSuccess: async (data) => {
      setResult({ success: true, spaceName: data.space_name, spaceId: data.space_id })
      await queryClient.invalidateQueries({ queryKey: ['spaces'] })
      await queryClient.fetchQuery({ queryKey: ['spaces'] })
      // Редирект на товары нового пространства
      navigate(`/space/${data.space_id}/items`)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Не удалось принять приглашение'
      setResult({ success: false, error: msg })
    },
  })

  // Not logged in — показываем приглашение с кнопкой входа
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Приглашение в пространство</h1>
          <p className="text-slate-500 mb-6">
            Вам нужно войти, чтобы принять приглашение
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={`/login?redirect=/invite/${token}`}
              className="btn-primary w-full justify-center"
            >
              Войти и принять
            </a>
            <a
              href={`/register?redirect=/invite/${token}`}
              className="btn-secondary w-full justify-center"
            >
              Зарегистрироваться
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Уже приняли — показываем успех
  if (result?.success && result.spaceName) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Добро пожаловать!</h1>
          <p className="text-slate-500">
            Вы присоединились к <strong>{result.spaceName}</strong>
          </p>
          <p className="text-sm text-slate-400 mt-4">Перенаправляем...</p>
        </div>
      </div>
    )
  }

  // Ошибка
  if (result?.error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Ошибка</h1>
          <p className="text-slate-500 mb-6">{result.error}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            На товары
          </button>
        </div>
      </div>
    )
  }

  // Авторизован — показываем кнопку принятия
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-md w-full">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 mb-4">
          <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Приглашение в пространство</h1>
        <p className="text-slate-500 mb-6">
          Нажмите кнопку ниже, чтобы присоединиться
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            className="btn-primary w-full justify-center"
          >
            {joinMutation.isPending ? 'Присоединение...' : 'Присоединиться'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary w-full justify-center"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
