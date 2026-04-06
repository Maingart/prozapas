import { useState, useRef, useEffect } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

export default function Select({ value, onChange, options, placeholder = 'Выберите...', className = '' }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const selectedOption = options.find(opt => opt.value === value)
  const displayText = selectedOption?.label || placeholder

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-left hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8 appearance-none"
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>{displayText}</span>
      </button>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 20 20">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 8l4 4 4-4" />
        </svg>
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">Нет вариантов</div>
          ) : (
            <>
              {placeholder && (
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors text-slate-400"
                >
                  {placeholder}
                </button>
              )}
              {options.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
                    option.value === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
