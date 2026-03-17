import React from 'react'
import { SunOutlined, MoonOutlined, DesktopOutlined } from '@ant-design/icons'
import { useTheme } from '../hooks/useTheme'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    setTheme(next)
  }

  return (
    <button className="icon-btn" onClick={cycleTheme} title={`当前: ${theme}`}>
      {theme === 'light' ? <SunOutlined /> : theme === 'dark' ? <MoonOutlined /> : <DesktopOutlined />}
    </button>
  )
}