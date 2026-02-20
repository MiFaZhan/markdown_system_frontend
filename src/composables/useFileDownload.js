import { ElMessage } from 'element-plus'

export function useFileDownload() {
  const addExtensionIfNeeded = (fileName, extension) => {
    if (!fileName) return extension
    const ext = extension.startsWith('.') ? extension : `.${extension}`
    return fileName.toLowerCase().endsWith(ext.toLowerCase()) ? fileName : `${fileName}${ext}`
  }

  const downloadBlob = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadMarkdown = (content, fileName) => {
    const finalName = addExtensionIfNeeded(fileName || 'document', 'md')
    downloadBlob(content, finalName, 'text/markdown;charset=utf-8')
    ElMessage.success('导出成功')
  }

  const downloadHtml = (html, fileName) => {
    const finalName = addExtensionIfNeeded(fileName || 'document', 'html')
    downloadBlob(html, finalName, 'text/html;charset=utf-8')
    ElMessage.success('导出成功')
  }

  return {
    addExtensionIfNeeded,
    downloadBlob,
    downloadMarkdown,
    downloadHtml
  }
}
