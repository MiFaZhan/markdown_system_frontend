export function useVditorPreview(isDark, onOutlineUpdate) {
  const renderPreview = async (element, markdown) => {
    if (!element || !markdown) {
      if (element) {
        element.innerHTML = '<div class="empty-content"><span>文件内容为空</span></div>'
      }
      if (onOutlineUpdate) {
        onOutlineUpdate([])
      }
      return
    }

    const Vditor = (await import('vditor')).default
    await import('vditor/dist/index.css')

    Vditor.preview(element, markdown, {
      cdn: '/vditor/',
      mode: isDark.value ? 'dark' : 'light',
      theme: {
        current: isDark.value ? 'dark' : 'light'
      },
      hljs: {
        style: isDark.value ? 'native' : 'github'
      },
      after() {
        if (isDark.value) {
          element.classList.add('vditor--dark')
        } else {
          element.classList.remove('vditor--dark')
        }
        if (onOutlineUpdate) {
          const outline = extractOutlineFromDOM(element)
          onOutlineUpdate(outline)
        }
      }
    })
  }

  const extractOutlineFromDOM = (element) => {
    if (!element) return []
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const outline = []

    headings.forEach((heading, index) => {
      const id = `heading-${index}`
      heading.id = id
      outline.push({
        id: id,
        text: heading.innerText,
        level: parseInt(heading.tagName.substring(1)),
        line: index
      })
    })

    return outline
  }

  const jumpToHeading = (node) => {
    const el = document.getElementById(node.id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return {
    renderPreview,
    extractOutlineFromDOM,
    jumpToHeading
  }
}
