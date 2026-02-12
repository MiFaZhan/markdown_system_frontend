import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { getMarkdownContent, updateMarkdownContent } from '../api/contentService'

export function useEditor({ onContentChange, onAfterInit, onOutlineUpdate }) {
  const saveTimers = ref({})

  const initVditor = (tab, onInput) => {
    console.log('[useEditor] initVditor 开始，tab:', tab)
    console.log('[useEditor] tab.isInitialized:', tab.isInitialized)
    console.log('[useEditor] tab.vditorInstance:', tab.vditorInstance)
    
    if (tab.isInitialized && tab.vditorInstance) {
      console.log('[useEditor] 编辑器已初始化，只切换容器显示')
      const editorContainer = document.getElementById('editor-container')
      if (editorContainer) {
        Array.from(editorContainer.children).forEach(child => {
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
    console.log('[useEditor] editor-container 存在:', !!editorContainer)
    if (!editorContainer) {
      ElMessage.error('编辑器容器不存在')
      return null
    }
    
    let container = document.getElementById(tab.containerId)
    console.log('[useEditor] 容器 ID:', tab.containerId, '存在:', !!container)
    if (container) {
      console.log('[useEditor] 容器已存在，移除')
      container.remove()
    }
    
    container = document.createElement('div')
    container.id = tab.containerId
    container.className = 'vditor-wrapper'
    container.style.height = '100%'
    container.style.display = 'block'
    editorContainer.appendChild(container)
    
    Array.from(editorContainer.children).forEach(child => {
      if (child.id !== tab.containerId) {
        child.style.display = 'none'
      }
    })
    
    console.log('[useEditor] 新容器已添加到 DOM')
    console.log('[useEditor] editor-container 的子元素数量:', editorContainer.children.length)
    console.log('[useEditor] 所有子元素:', Array.from(editorContainer.children).map(c => ({ id: c.id, display: c.style.display })))
    
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
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
        typewriterMode: true,
        toolbarConfig: {
          pin: true
        },
        toolbar: [
          'headings', 'bold', 'italic', 'strike', 'link', '|',
          'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
          'quote', 'line', 'code', 'inline-code', '|',
          'upload', 'table', '|',
          'undo', 'redo', '|',
          'preview', 'fullscreen'
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
        },
        after: () => {
          tab.isInitialized = true
          
          nextTick(() => {
            injectSaveStatus(tab)
          })
          
          if (onAfterInit) {
            onAfterInit(tab)
          }
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
      
      const result = await updateMarkdownContent(
        tab.fileId,
        tab.content,
        tab.version
      )
      
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
      } catch (error) {
        console.warn('销毁 vditor 失败:', error)
      }
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
    saveTimers
  }
}
