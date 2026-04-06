import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AddSpaceModal from './AddSpaceModal'

export default function EmptyState() {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)

  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50 items-center justify-center p-4">
      <div className="card p-8 text-center max-w-md w-full">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 mb-4">
          <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Добро пожаловать!</h1>
        <p className="text-slate-500 mb-6">
          Вы пока не состоите ни в одном пространстве. Создайте первое, чтобы начать учёт запасов.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary w-full justify-center"
          >
            Создать пространство
          </button>
          <div className="text-xs text-slate-400 mt-2">
            Или примите приглашение от другого пользователя
          </div>
        </div>
      </div>

      <AddSpaceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  )
}
