import { useState, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

function PWAUpdatePrompt() {
  const [showReload, setShowReload] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, _r) {
      console.log(`Service Worker at: ${swUrl}`)
    },
    onOfflineReady() {
      console.log('PWA: App ready for offline use')
    },
  })

  useEffect(() => {
    setShowReload(needRefresh)
  }, [needRefresh])

  // Handle install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleUpdate = async () => {
    await updateServiceWorker(true)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('PWA: User accepted the install prompt')
    } else {
      console.log('PWA: User dismissed the install prompt')
    }

    setDeferredPrompt(null)
    setShowInstall(false)
  }

  const dismissInstall = () => {
    setDeferredPrompt(null)
    setShowInstall(false)
  }

  // Don't show anything if no updates available and not showing install prompt
  if (!showReload && !showInstall) {
    return null
  }

  return (
    <>
      {/* Update prompt */}
      {showReload && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-indigo-600 text-white rounded-lg shadow-xl p-4 flex items-center justify-between gap-3 animate-slide-up">
          <div className="flex-1">
            <p className="font-medium">Доступна новая версия</p>
            <p className="text-sm text-indigo-100">Обновите для получения последних изменений</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setNeedRefresh(false)}
              className="px-3 py-1.5 text-sm bg-indigo-500 hover:bg-indigo-400 rounded transition-colors"
            >
              Позже
            </button>
            <button
              onClick={handleUpdate}
              className="px-3 py-1.5 text-sm bg-white text-indigo-600 font-medium rounded hover:bg-indigo-50 transition-colors"
            >
              Обновить
            </button>
          </div>
        </div>
      )}

      {/* Install prompt */}
      {showInstall && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-indigo-600 text-white rounded-lg shadow-xl p-4 flex items-center justify-between gap-3 animate-slide-up">
          <div className="flex-1">
            <p className="font-medium">Установить приложение</p>
            <p className="text-sm text-indigo-100">Добавьте "Про Запас" на главный экран для быстрого доступа</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={dismissInstall}
              className="px-3 py-1.5 text-sm bg-indigo-500 hover:bg-indigo-400 rounded transition-colors"
            >
              Позже
            </button>
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 text-sm bg-white text-indigo-600 font-medium rounded hover:bg-indigo-50 transition-colors"
            >
              Установить
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default PWAUpdatePrompt
