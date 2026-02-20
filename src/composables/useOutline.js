import { ref } from 'vue'

export function useOutline() {
  const outline = ref([])

  const parseOutlineFromMarkdown = (content) => {
    if (!content) {
      outline.value = []
      return []
    }

    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const headings = []
    const lines = normalizedContent.split('\n')
    let inCodeBlock = false

    for (const line of lines) {
      if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
        inCodeBlock = !inCodeBlock
        continue
      }

      if (inCodeBlock) {
        continue
      }

      const match = line.match(/^\s*(#{1,6})\s+(.+)$/)
      if (match) {
        let text = match[2].trim()
        text = text
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`(.*?)`/g, '$1')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .replace(/!\[(.*?)\]\(.*?\)/g, '')
          .replace(/~~(.*?)~~/g, '$1')

        headings.push({
          level: match[1].length,
          text: text
        })
      }
    }

    outline.value = headings
    return headings
  }

  const extractOutlineFromDOM = (element) => {
    if (!element) {
      outline.value = []
      return []
    }

    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const result = []

    headings.forEach((heading, index) => {
      const id = `heading-${index}`
      heading.id = id
      result.push({
        id: id,
        text: heading.innerText,
        level: parseInt(heading.tagName.substring(1)),
        line: index
      })
    })

    outline.value = result
    return result
  }

  const jumpToHeading = (node) => {
    const el = document.getElementById(node.id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return {
    outline,
    parseOutlineFromMarkdown,
    extractOutlineFromDOM,
    jumpToHeading
  }
}
