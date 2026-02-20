import { ref } from 'vue'

export function usePanelResize(options = {}) {
  const { minWidth = 150, maxWidth = 400, defaultWidth = 250, direction = 'left' } = options

  const width = ref(defaultWidth)

  const startResize = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width.value

    const onMouseMove = (moveEvent) => {
      const delta = direction === 'left' ? moveEvent.clientX - startX : startX - moveEvent.clientX
      width.value = Math.max(minWidth, Math.min(maxWidth, startWidth + delta))
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return {
    width,
    startResize
  }
}
