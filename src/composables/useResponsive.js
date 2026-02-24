import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useResponsive({
  sidebar,
  outline,
  sidebarWidth,
  outlineWidth,
  defaultSidebarWidth = 260,
  defaultOutlineWidth = 400
}) {
  const isMobile = ref(false)
  let lastWidth = window.innerWidth
  let resizeTimer = null

  const checkResponsive = (isInit = false) => {
    const width = window.innerWidth
    isMobile.value = width < 700

    if (width < 1200) {
      if (isInit || (lastWidth >= 1200 && outline.value)) {
        outline.value = false
      }
    }

    if (width < 700) {
      if (isInit || (lastWidth >= 700 && sidebar.value)) {
        sidebar.value = false
      }
      if (sidebarWidth) {
        sidebarWidth.value = Math.min(defaultSidebarWidth, Math.floor(width * 0.85))
      }
      if (outlineWidth) {
        outlineWidth.value = Math.min(defaultOutlineWidth, Math.floor(width * 0.85))
      }
    } else {
      if (sidebarWidth && sidebarWidth.value !== defaultSidebarWidth) {
        sidebarWidth.value = defaultSidebarWidth
      }
      if (outlineWidth && outlineWidth.value !== defaultOutlineWidth) {
        outlineWidth.value = defaultOutlineWidth
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
