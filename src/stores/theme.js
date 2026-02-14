import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const THEME_KEY = 'markdown-theme-preference'
  
  const currentTheme = ref('auto')
  
  const themes = {
    light: 'light',
    dark: 'dark',
    auto: 'auto'
  }
  
  function getEffectiveTheme() {
    if (currentTheme.value === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return currentTheme.value
  }
  
  function applyTheme() {
    const effectiveTheme = getEffectiveTheme()
    document.documentElement.setAttribute('data-theme', effectiveTheme)
    
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
  
  function setTheme(theme) {
    if (!Object.values(themes).includes(theme)) {
      return
    }
    
    currentTheme.value = theme
    localStorage.setItem(THEME_KEY, theme)
    applyTheme()
  }
  
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY)
    if (savedTheme && Object.values(themes).includes(savedTheme)) {
      currentTheme.value = savedTheme
    }
    applyTheme()
  }
  
  function cycleTheme() {
    const themeOrder = ['light', 'dark', 'auto']
    const currentIndex = themeOrder.indexOf(currentTheme.value)
    const nextIndex = (currentIndex + 1) % themeOrder.length
    setTheme(themeOrder[nextIndex])
  }
  
  function getThemeIcon() {
    switch (currentTheme.value) {
      case 'light':
        return 'Sunny'
      case 'dark':
        return 'Moon'
      case 'auto':
        return 'Sunny'
      default:
        return 'Sunny'
    }
  }
  
  function getThemeTooltip() {
    switch (currentTheme.value) {
      case 'light':
        return '浅色模式'
      case 'dark':
        return '深色模式'
      case 'auto':
        return '跟随浏览器'
      default:
        return '浅色模式'
    }
  }
  
  watch(currentTheme, () => {
    applyTheme()
  })
  
  return {
    currentTheme,
    setTheme,
    initTheme,
    cycleTheme,
    getThemeIcon,
    getThemeTooltip,
    getEffectiveTheme
  }
})
