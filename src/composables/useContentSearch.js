import { ref, watch, nextTick } from 'vue'
import { searchContentInFile } from '../api/contentService'

export function useContentSearch(options = {}) {
  const { getCurrentFileId, getVditorInstance, onSelectFile } = options

  const contentSearchKeyword = ref('')
  const contentSearchResults = ref([])

  const searchInContent = async () => {
    const keyword = contentSearchKeyword.value.trim()

    if (!keyword) {
      contentSearchResults.value = []
      return
    }

    const nodeId = getCurrentFileId?.()
    if (!nodeId) return

    try {
      const response = await searchContentInFile(nodeId, keyword)
      contentSearchResults.value = response.map((item) => ({
        nodeId: item.nodeId,
        nodeName: item.nodeName,
        parentPath: item.parentPath,
        line: item.line,
        text: item.matchedText || '(空行)',
        matchCount: item.matchCount
      }))
    } catch (error) {
      contentSearchResults.value = []
    }
  }

  const jumpToSearchResult = async (result) => {
    const currentFileId = getCurrentFileId?.()
    if (result.nodeId && result.nodeId !== currentFileId) {
      await onSelectFile?.({ id: result.nodeId, nodeName: result.nodeName })
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 800))
    }

    const vditorInstance = getVditorInstance?.()
    if (!vditorInstance) return

    clearHighlights()

    const irElement = vditorInstance.vditor.ir.element
    const keyword = contentSearchKeyword.value.trim()
    const targetLine = result.line
    const matchedText = result.text?.trim() || ''

    const markdownContent = vditorInstance.getValue()
    const totalLines = markdownContent.split('\n').length
    const scrollRatio = Math.max(0, Math.min(1, (targetLine - 1) / totalLines))

    const irScrollContainer = irElement.closest('.vditor-ir') || irElement.parentElement
    const maxScroll = irScrollContainer.scrollHeight - irScrollContainer.clientHeight
    const estimatedScrollTop = scrollRatio * maxScroll

    irScrollContainer.scrollTo({
      top: Math.max(0, estimatedScrollTop - 100),
      behavior: 'smooth'
    })

    await new Promise((resolve) => setTimeout(resolve, 300))

    const viewportRect = irScrollContainer.getBoundingClientRect()
    const walker = document.createTreeWalker(irElement, NodeFilter.SHOW_TEXT, null, false)
    const candidates = []
    const keywordLower = keyword.toLowerCase()

    while (walker.nextNode()) {
      const node = walker.currentNode
      const text = node.textContent

      if (!text.toLowerCase().includes(keywordLower)) continue

      const range = document.createRange()
      range.selectNode(node)
      const nodeRect = range.getBoundingClientRect()

      const expandedTop = viewportRect.top - 500
      const expandedBottom = viewportRect.bottom + 500

      if (nodeRect.bottom < expandedTop || nodeRect.top > expandedBottom) continue

      let score = 0

      if (matchedText && text.includes(matchedText)) {
        score += 100
      }

      if (matchedText) {
        const similarity = calculateSimilarity(text.trim(), matchedText)
        score += similarity * 50
      }

      const distanceFromCenter = Math.abs(
        (nodeRect.top + nodeRect.bottom) / 2 - (viewportRect.top + viewportRect.bottom) / 2
      )
      score += Math.max(0, 30 - distanceFromCenter / 50)

      candidates.push({ node, text, score, rect: nodeRect })
    }

    candidates.sort((a, b) => b.score - a.score)

    if (candidates.length === 0) {
      const walker2 = document.createTreeWalker(irElement, NodeFilter.SHOW_TEXT, null, false)
      while (walker2.nextNode()) {
        const node = walker2.currentNode
        if (node.textContent.toLowerCase().includes(keywordLower)) {
          candidates.push({ node, text: node.textContent, score: 0 })
          break
        }
      }
    }

    if (candidates.length === 0) {
      return
    }

    const bestMatch = candidates[0]
    const targetNode = bestMatch.node

    highlightNode(targetNode, keyword)
  }

  const clearHighlights = () => {
    document.querySelectorAll('.search-match-highlight').forEach((el) => {
      const parent = el.parentElement
      while (el.firstChild) parent.insertBefore(el.firstChild, el)
      parent.removeChild(el)
    })
  }

  const highlightNode = (targetNode, keyword) => {
    const nodeText = targetNode.textContent
    const keywordStart = nodeText.toLowerCase().indexOf(keyword.toLowerCase())

    if (keywordStart === -1) {
      return
    }

    try {
      const range = document.createRange()
      range.setStart(targetNode, keywordStart)
      range.setEnd(targetNode, keywordStart + keyword.length)

      const mark = document.createElement('mark')
      mark.className = 'search-match-highlight'
      mark.style.backgroundColor = '#fde047'
      mark.style.color = '#854d0e'
      mark.style.padding = '0 2px'
      mark.style.borderRadius = '2px'

      range.surroundContents(mark)
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' })

      setTimeout(() => {
        if (mark.parentElement) {
          const parent = mark.parentElement
          while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
          parent.removeChild(mark)
        }
      }, 3000)
    } catch {
      // 高亮移除失败，忽略错误
    }
  }

  const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase().replace(/\s+/g, ' ')
    const s2 = str2.toLowerCase().replace(/\s+/g, ' ')

    if (s1 === s2) return 1
    if (s1.includes(s2) || s2.includes(s1)) return 0.8

    const words1 = s1.split(/\s+/)
    const words2 = s2.split(/\s+/)
    const set2 = new Set(words2)
    const commonWords = words1.filter((w) => set2.has(w)).length
    return commonWords / Math.max(words1.length, words2.length)
  }

  watch(contentSearchKeyword, () => {
    searchInContent()
  })

  return {
    contentSearchKeyword,
    contentSearchResults,
    searchInContent,
    jumpToSearchResult,
    clearHighlights
  }
}
