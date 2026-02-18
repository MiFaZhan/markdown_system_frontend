import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useResponsive({ sidebar, outline, sidebarWidth, outlineWidth }) {
  const isMobile = ref(false)
  let lastWidth = window.innerWidth
  let resizeTimer = null

  const checkResponsive = (isInit = false) => {
    const width = window.innerWidth
    isMobile.value = width < 700

    if (width < 1000) {
      if (isInit || (lastWidth >= 1000 && outline.value)) {
        outline.value = false
      }
    }

    if (width < 700) {
      if (isInit || (lastWidth >= 700 && sidebar.value)) {
        sidebar.value = false
      }
      if (sidebarWidth) {
        sidebarWidth.value = Math.min(260, Math.floor(width * 0.85))
      }
      if (outlineWidth) {
        outlineWidth.value = Math.min(300, Math.floor(width * 0.85))
      }
    } else {
      if (sidebarWidth && sidebarWidth.value !== 260) {
        sidebarWidth.value = 260
      }
      if (outlineWidth && outlineWidth.value !== 400) {
        outlineWidth.value = 400
      }
    }

    lastWidth = width
  }

  const handleResize = () => {
    if (resizeTimer) return
    resizeTimer = requestAnimationFrame(() => {
      checkResponsive(false)
      resizeTimer = null
    })
  }

  onMounted(() => {
    checkResponsive(true)
    window.addEventListener('resize', handleResize)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    if (resizeTimer) {
      cancelAnimationFrame(resizeTimer)
    }
  })

  return {
    isMobile,
    checkResponsive
  }
}
