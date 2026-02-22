import { ElMessage } from 'element-plus'
import Vditor from 'vditor'

const escapeHtml = (str) => {
  if (!str) return ''
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return str.replace(/[&<>"']/g, (char) => escapeMap[char])
}

const addExtensionIfNeeded = (fileName, extension) => {
  if (!fileName) return extension
  const ext = extension.startsWith('.') ? extension : `.${extension}`
  return fileName.toLowerCase().endsWith(ext.toLowerCase()) ? fileName : `${fileName}${ext}`
}

export function useExportAndCopy(getTabByFileId, currentFileId) {
  const handleExportMarkdown = () => {
    const currentTab = getTabByFileId(currentFileId.value)
    if (!currentTab || !currentTab.vditorInstance) return

    const content = currentTab.vditorInstance.getValue()
    const fileName = addExtensionIfNeeded(currentTab.fileName || 'document', 'md')
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportPdf = async () => {
    const currentTab = getTabByFileId(currentFileId.value)
    if (!currentTab || !currentTab.vditorInstance) return

    const markdown = currentTab.vditorInstance.getValue()
    const fileName = currentTab.fileName || 'document'

    const content = await Vditor.md2html(markdown, {
      cdn: '/vditor/',
      preview: {
        theme: {
          path: '/vditor/dist/css/content-theme'
        }
      }
    })

    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(fileName)}</title>
  <link rel="stylesheet" href="/vditor/dist/index.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
      background-color: #fff !important;
    }
    .vditor-reset {
      font-size: 14px;
    }
    @media print {
      @page {
        margin: 1cm;
      }
      body {
        padding: 0;
        margin: 0;
        max-width: none;
      }
      .vditor-reset {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="vditor-reset">
    ${content}
  </div>
</body>
</html>`

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(fullHtml)
    doc.close()

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        document.body.removeChild(iframe)
      }, 500)
    }
  }

  const handleExportHtml = () => {
    const currentTab = getTabByFileId(currentFileId.value)
    if (!currentTab || !currentTab.vditorInstance) return

    const content = currentTab.vditorInstance.getHTML()
    const fileName = currentTab.fileName || 'document'

    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(fileName)}</title>
  <link rel="stylesheet" href="/vditor/dist/index.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1a1a1a;
        color: #e0e0e0;
      }
    }
  </style>
</head>
<body>
  <div class="vditor-reset">
    ${content}
  </div>
</body>
</html>`

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = addExtensionIfNeeded(fileName, 'html')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCopyMarkdown = () => {
    const currentTab = getTabByFileId(currentFileId.value)
    if (!currentTab || !currentTab.vditorInstance) return

    const content = currentTab.vditorInstance.getValue()
    navigator.clipboard
      .writeText(content)
      .then(() => {
        ElMessage.success('已复制 Markdown')
      })
      .catch(() => {
        ElMessage.error('复制失败')
      })
  }

  const handleCopyZhihu = async () => {
    const currentTab = getTabByFileId(currentFileId.value)
    if (!currentTab || !currentTab.vditorInstance) return

    const markdown = currentTab.vditorInstance.getValue()

    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'fixed'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '0'
    document.body.appendChild(tempDiv)

    try {
      await Vditor.preview(tempDiv, markdown, {
        mode: 'light',
        cdn: '/vditor/',
        lazyLoadImage: 'https://unpkg.com/vditor/dist/images/img-loading.svg',
        anchor: 1,
        hljs: {
          style: 'github'
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 300))

      const zhihuBtn = tempDiv.querySelector('button[data-type="zhihu"]')
      if (zhihuBtn) {
        zhihuBtn.click()
      } else {
        ElMessage.error('找不到知乎复制按钮，请稍后重试')
      }
    } catch (error) {
      ElMessage.error('复制到知乎失败')
    } finally {
      document.body.removeChild(tempDiv)
    }
  }

  const handleCopyWechat = async () => {
    const currentTab = getTabByFileId(currentFileId.value)
    if (!currentTab || !currentTab.vditorInstance) return

    const markdown = currentTab.vditorInstance.getValue()

    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'fixed'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '0'
    document.body.appendChild(tempDiv)

    try {
      await Vditor.preview(tempDiv, markdown, {
        mode: 'light',
        cdn: '/vditor/',
        lazyLoadImage: 'https://unpkg.com/vditor/dist/images/img-loading.svg',
        anchor: 1,
        hljs: {
          style: 'github'
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 300))

      const wechatBtn = tempDiv.querySelector('button[data-type="mp-wechat"]')
      if (wechatBtn) {
        wechatBtn.click()
      } else {
        ElMessage.error('找不到公众号复制按钮，请稍后重试')
      }
    } catch (error) {
      ElMessage.error('复制到公众号失败')
    } finally {
      document.body.removeChild(tempDiv)
    }
  }

  return {
    handleExportMarkdown,
    handleExportPdf,
    handleExportHtml,
    handleCopyMarkdown,
    handleCopyZhihu,
    handleCopyWechat
  }
}
