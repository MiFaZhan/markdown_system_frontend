import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { getMarkdownContent, updateMarkdownContent } from '../api/contentService'
import { uploadImage } from '../api/imageService'
import { useThemeStore } from '../stores/theme'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export function useEditor({ onContentChange, onAfterInit, onOutlineUpdate }) {
  const saveTimers = ref({})
  const themeStore = useThemeStore()

  const initVditor = (tab, onInput) => {
    console.log(
      '[Outline] initVditor 开始初始化, fileId:',
      tab?.fileId,
      'containerId:',
      tab?.containerId
    )

    if (tab.isInitialized && tab.vditorInstance) {
      console.log('[Outline] Vditor 已初始化，切换到当前标签页, fileId:', tab.fileId)
      const editorContainer = document.getElementById('editor-container')
      if (editorContainer) {
        Array.from(editorContainer.children).forEach((child) => {
          if (child.id === tab.containerId) {
            child.style.display = 'block'
          } else {
            child.style.display = 'none'
          }
        })
      }
      return tab.vditorInstance
    }

    const editorContainer = document.getElementById('editor-container')
    if (!editorContainer) {
      console.error('[Outline] 编辑器容器不存在')
      ElMessage.error('编辑器容器不存在')
      return null
    }

    let container = document.getElementById(tab.containerId)
    if (container) {
      console.log('[Outline] 移除已存在的容器, containerId:', tab.containerId)
      container.remove()
    }

    container = document.createElement('div')
    container.id = tab.containerId
    container.className = 'vditor-wrapper'
    container.style.height = '100%'
    container.style.display = 'block'
    editorContainer.appendChild(container)
    console.log('[Outline] 创建新容器, containerId:', tab.containerId)

    Array.from(editorContainer.children).forEach((child) => {
      if (child.id !== tab.containerId) {
        child.style.display = 'none'
      }
    })

    const effectiveTheme = themeStore.getEffectiveTheme()
    const isDark = effectiveTheme === 'dark'

    try {
      console.log(
        '[Outline] 开始创建 Vditor 实例, fileId:',
        tab.fileId,
        '初始内容长度:',
        tab.content?.length || 0
      )
      const vditorInstance = new Vditor(tab.containerId, {
        height: '100%',
        width: '100%',
        mode: 'ir',
        placeholder: '开始写作...',
        theme: isDark ? 'dark' : 'classic',
        cdn: '/vditor/',
        preview: {
          theme: {
            current: isDark ? 'dark' : 'light',
            path: '/vditor/dist/css/content-theme'
          },
          hljs: {
            style: isDark ? 'native' : 'github'
          }
        },
        cache: {
          enable: false
        },
        upload: {
          accept: 'image/*',
          url: `${API_BASE_URL}/api/image/upload`,
          multiple: false,
          fieldName: 'file[]',
          extraData: () => {
            return {
              projectId: tab.projectId || 1,
              nodeId: tab.fileId || 1
            }
          },
          handler: async (files) => {
            try {
              const file = files[0]
              const projectId = tab.projectId || 1
              const nodeId = tab.fileId || 1
              const imageUrl = await uploadImage(file, projectId, nodeId)
              // imageUrl 已经包含 /api/images 前缀，如果 API_BASE_URL 也包含 /api，需要处理
              // 通常 API_BASE_URL 是 host:port，所以直接拼接即可
              // 如果 imageUrl 已经是完整路径（带 http），则不需要拼接
              let fullImageUrl = imageUrl
              if (!imageUrl.startsWith('http')) {
                // 从 API_BASE_URL 提取 Origin (协议+域名+端口)
                // 例如 http://localhost:8080/api -> http://localhost:8080
                let origin = ''
                try {
                  if (API_BASE_URL.startsWith('http')) {
                    const urlObj = new URL(API_BASE_URL)
                    origin = urlObj.origin
                  } else {
                    // 如果 API_BASE_URL 是相对路径 (如 /api)，则使用当前页面 Origin
                    origin = window.location.origin
                  }
                } catch (e) {
                  console.error('解析 API_BASE_URL 失败:', e)
                  origin = window.location.origin
                }

                // 确保路径以 / 开头
                const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
                fullImageUrl = `${origin}${path}`
              }
              tab.vditorInstance.insertValue(`![${file.name}](${fullImageUrl})`)
              ElMessage.success('图片上传成功')
            } catch (error) {
              ElMessage.error('图片上传失败: ' + error.message)
            }
            return null
          }
        },
        typewriterMode: true,
        toolbarConfig: {
          pin: true
        },
        toolbar: [
          'headings',
          'bold',
          'italic',
          'strike',
          'link',
          '|',
          'list',
          'ordered-list',
          'check',
          'outdent',
          'indent',
          '|',
          'quote',
          'line',
          'code',
          'inline-code',
          '|',
          'upload',
          'table',
          '|',
          'undo',
          'redo',
          '|',
          'preview',
          'fullscreen'
        ],
        outline: {
          enable: false
        },
        value: tab.content,
        input: (value) => {
          console.log(
            '[Outline] Vditor input 事件触发, fileId:',
            tab.fileId,
            '内容长度:',
            value?.length || 0
          )
          tab.content = value
          tab.isDirty = value !== tab.lastSavedContent

          if (onOutlineUpdate) {
            onOutlineUpdate(value)
          }

          if (onContentChange) {
            onContentChange(tab)
          }

          if (onInput) {
            onInput(tab)
          }
        },
        after: () => {
          console.log('[Outline] Vditor after 回调触发, fileId:', tab.fileId)
          tab.isInitialized = true

          nextTick(() => {
            injectSaveStatus(tab)

            if (onAfterInit) {
              onAfterInit(tab)
            }
          })
        }
      })

      console.log('[Outline] Vditor 实例创建完成, fileId:', tab.fileId)
      return vditorInstance
    } catch (error) {
      console.error('[Outline] Vditor 初始化失败, fileId:', tab?.fileId, error)
      ElMessage.error('编辑器初始化失败')
      return null
    }
  }

  const injectSaveStatus = (tab) => {
    const container = document.getElementById(tab.containerId)
    if (!container) {
      return
    }

    const toolbar = container.querySelector('.vditor-toolbar')
    if (!toolbar) {
      return
    }

    if (tab.saveStatusElement) {
      return
    }

    const saveStatus = document.createElement('div')
    saveStatus.className = 'vditor-toolbar__item vditor-toolbar__save-status'
    saveStatus.innerHTML = `
      <span class="save-status-text saved">
        已保存
      </span>
    `

    toolbar.appendChild(saveStatus)

    tab.saveStatusElement = saveStatus
  }

  const updateSaveStatus = (tab) => {
    if (!tab || !tab.saveStatusElement) return

    const textEl = tab.saveStatusElement.querySelector('.save-status-text')
    if (!textEl) return

    if (tab.isSaving) {
      textEl.innerHTML = `
        <svg class="save-status-icon rotating" style="width: 14px; height: 14px;">
          <use xlink:href="#vditor-icon-refresh"></use>
        </svg>
        保存中
      `
      textEl.className = 'save-status-text saving'
    } else if (tab.isDirty) {
      textEl.innerHTML = '未保存'
      textEl.className = 'save-status-text unsaved'
    } else {
      textEl.innerHTML = '已保存'
      textEl.className = 'save-status-text saved'
    }
  }

  const saveTab = async (tab) => {
    if (!tab.isDirty || tab.isSaving) {
      console.log(
        '[Outline] saveTab 跳过保存, fileId:',
        tab?.fileId,
        'isDirty:',
        tab?.isDirty,
        'isSaving:',
        tab?.isSaving
      )
      return
    }

    try {
      console.log('[Outline] saveTab 开始保存, fileId:', tab.fileId, '当前版本:', tab.version)
      tab.isSaving = true
      updateSaveStatus(tab)

      const result = await updateMarkdownContent(tab.fileId, tab.content, tab.version)
      console.log('[Outline] saveTab 保存成功, fileId:', tab.fileId, '新版本:', result.version)

      tab.version = result.version
      tab.lastSavedContent = tab.content
      tab.isDirty = false
    } catch (error) {
      console.error('[Outline] saveTab 保存失败, fileId:', tab?.fileId, error)
      ElMessage.error('保存失败: ' + error.message)
    } finally {
      tab.isSaving = false
      updateSaveStatus(tab)
    }
  }

  const loadFileContent = async (fileId) => {
    console.log('[Outline] loadFileContent 开始加载文件内容, fileId:', fileId)
    try {
      const contentData = await getMarkdownContent(fileId)
      console.log(
        '[Outline] loadFileContent 文件内容加载成功, fileId:',
        fileId,
        '内容长度:',
        contentData?.content?.length || 0,
        '版本:',
        contentData?.version
      )
      return contentData
    } catch (error) {
      console.error('[Outline] loadFileContent 文件内容加载失败, fileId:', fileId, error)
      ElMessage.error('加载文件失败: ' + error.message)
      throw error
    }
  }

  const debouncedSave = (tab, delay = 1000) => {
    if (saveTimers.value[tab.fileId]) {
      clearTimeout(saveTimers.value[tab.fileId])
    }

    saveTimers.value[tab.fileId] = setTimeout(() => {
      saveTab(tab)
    }, delay)
  }

  const destroyVditor = (vditorInstance) => {
    if (vditorInstance) {
      try {
        vditorInstance.destroy()
      } catch {
        // vditor销毁可能失败，忽略错误
      }
    }
  }

  const updateVditorTheme = (vditorInstance, isDark) => {
    if (!vditorInstance) return

    try {
      vditorInstance.setTheme(isDark ? 'dark' : 'classic')
      vditorInstance.setCodeTheme(isDark ? 'native' : 'github')
      vditorInstance.setContentTheme(isDark ? 'dark' : 'light', '/vditor/dist/css/content-theme')
    } catch (error) {
      console.error('[Outline] 更新 Vditor 主题失败:', error)
    }
  }

  return {
    initVditor,
    injectSaveStatus,
    updateSaveStatus,
    saveTab,
    loadFileContent,
    debouncedSave,
    destroyVditor,
    updateVditorTheme,
    saveTimers
  }
}
