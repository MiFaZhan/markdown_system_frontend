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
    if (tab.isInitialized && tab.vditorInstance) {
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
      ElMessage.error('编辑器容器不存在')
      return null
    }

    let container = document.getElementById(tab.containerId)
    if (container) {
      container.remove()
    }

    container = document.createElement('div')
    container.id = tab.containerId
    container.className = 'vditor-wrapper'
    container.style.height = '100%'
    container.style.display = 'block'
    editorContainer.appendChild(container)

    Array.from(editorContainer.children).forEach((child) => {
      if (child.id !== tab.containerId) {
        child.style.display = 'none'
      }
    })

    const effectiveTheme = themeStore.getEffectiveTheme()
    const isDark = effectiveTheme === 'dark'

    try {
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
              let fullImageUrl = imageUrl
              if (!imageUrl.startsWith('http')) {
                let origin = ''
                try {
                  if (API_BASE_URL.startsWith('http')) {
                    const urlObj = new URL(API_BASE_URL)
                    origin = urlObj.origin
                  } else {
                    origin = window.location.origin
                  }
                } catch (e) {
                  origin = window.location.origin
                }

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
          tab.isInitialized = true

          nextTick(() => {
            injectSaveStatus(tab)

            if (onAfterInit) {
              onAfterInit(tab)
            }
          })
        }
      })

      return vditorInstance
    } catch (error) {
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
      return
    }

    try {
      tab.isSaving = true
      updateSaveStatus(tab)

      const result = await updateMarkdownContent(tab.fileId, tab.content, tab.version)

      tab.version = result.version
      tab.lastSavedContent = tab.content
      tab.isDirty = false
    } catch (error) {
      ElMessage.error('保存失败: ' + error.message)
    } finally {
      tab.isSaving = false
      updateSaveStatus(tab)
    }
  }

  const loadFileContent = async (fileId) => {
    try {
      const contentData = await getMarkdownContent(fileId)
      return contentData
    } catch (error) {
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
      // 主题更新失败，忽略
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
