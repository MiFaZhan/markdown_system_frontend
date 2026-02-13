import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

export function useTabs({ onSwitch, onSave }) {
  const openTabs = ref([])
  const activeTabIndex = ref(-1)
  let saveTimers = {}

  const createTab = (file, contentData) => {
    return {
      fileId: file.id,
      fileName: file.name,
      content: contentData.content || '',
      version: contentData.version,
      vditorInstance: null,
      containerId: `vditor-${file.id}`,
      isInitialized: false,
      isDirty: false,
      lastSavedContent: contentData.content || '',
      isSaving: false,
      saveStatusElement: null
    }
  }

  const openTab = async (file, contentData) => {
    console.log('[useTabs] openTab 开始:', file, contentData)
    const existingIndex = openTabs.value.findIndex((tab) => tab.fileId === file.id)
    console.log('[useTabs] existingIndex:', existingIndex)
    if (existingIndex !== -1) {
      console.log('[useTabs] 标签已存在，切换到:', existingIndex)
      const result = switchTab(existingIndex)
      onSwitch(result)
      return
    }

    if (openTabs.value.length >= 10) {
      ElMessage.warning('最多同时打开 10 个标签')
      return
    }

    const newTab = createTab(file, contentData)
    console.log('[useTabs] 创建新标签:', newTab)
    openTabs.value.push(newTab)
    console.log('[useTabs] openTabs 现在的数量:', openTabs.value.length)

    const newIndex = openTabs.value.length - 1
    activeTabIndex.value = newIndex
    console.log('[useTabs] 调用 onSwitch，结果:', { needInit: true, tab: newTab, index: newIndex })
    onSwitch({ needInit: true, tab: newTab, index: newIndex })

    return newTab
  }

  const switchTab = (index) => {
    console.log('[useTabs] switchTab 开始，索引:', index)
    console.log('[useTabs] 当前 activeTabIndex:', activeTabIndex.value)
    console.log('[useTabs] openTabs 长度:', openTabs.value.length)
    console.log(
      '[useTabs] openTabs 内容:',
      openTabs.value.map((t) => ({ id: t.fileId, name: t.fileName, initialized: t.isInitialized }))
    )

    if (index < 0 || index >= openTabs.value.length) {
      console.log('[useTabs] 索引无效，返回 null')
      return { tab: null, index: -1 }
    }
    if (index === activeTabIndex.value) {
      const targetTab = openTabs.value[index]
      console.log('[useTabs] 切换到相同标签，返回:', targetTab)
      return { tab: targetTab, index, needInit: false }
    }

    if (activeTabIndex.value >= 0) {
      const currentTab = openTabs.value[activeTabIndex.value]
      console.log('[useTabs] 当前标签 (需要隐藏):', currentTab)
      if (currentTab?.vditorInstance) {
        const currentContainer = document.getElementById(currentTab.containerId)
        console.log(
          '[useTabs] 当前标签容器 ID:',
          currentTab.containerId,
          '存在:',
          !!currentContainer
        )
        if (currentContainer) {
          console.log('[useTabs] 隐藏当前标签容器')
          currentContainer.style.display = 'none'
        }
      }
    }

    activeTabIndex.value = index
    const targetTab = openTabs.value[index]
    console.log('[useTabs] 目标标签:', targetTab)
    console.log('[useTabs] targetTab.isInitialized:', targetTab.isInitialized)

    if (!targetTab.isInitialized) {
      console.log('[useTabs] 标签未初始化，需要初始化')
      return { needInit: true, tab: targetTab, index }
    } else {
      const targetContainer = document.getElementById(targetTab.containerId)
      console.log('[useTabs] 目标标签容器 ID:', targetTab.containerId, '存在:', !!targetContainer)
      if (targetContainer) {
        console.log('[useTabs] 显示目标标签容器，当前 display:', targetContainer.style.display)
        targetContainer.style.display = 'block'
      }
    }

    console.log('[useTabs] switchTab 返回:', {
      tab: targetTab,
      index,
      needInit: !targetTab.isInitialized
    })
    return { tab: targetTab, index, needInit: !targetTab.isInitialized }
  }

  const reorderTabs = ({ fromIndex, toIndex }) => {
    if (fromIndex === toIndex) return

    const movedTab = openTabs.value.splice(fromIndex, 1)[0]
    openTabs.value.splice(toIndex, 0, movedTab)

    if (activeTabIndex.value === fromIndex) {
      activeTabIndex.value = toIndex
    } else if (fromIndex < activeTabIndex.value && toIndex >= activeTabIndex.value) {
      activeTabIndex.value--
    } else if (fromIndex > activeTabIndex.value && toIndex <= activeTabIndex.value) {
      activeTabIndex.value++
    }
  }

  const closeTab = async (index) => {
    const tab = openTabs.value[index]

    if (tab.isDirty) {
      try {
        await ElMessageBox.confirm(
          `文件 "${tab.fileName}" 有未保存的修改，确定要关闭吗？`,
          '提示',
          {
            confirmButtonText: '关闭',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
      } catch {
        return false
      }
    }

    if (tab.vditorInstance) {
      try {
        tab.vditorInstance.destroy()
      } catch (error) {
        console.warn('销毁 vditor 失败:', error)
      }
    }

    const container = document.getElementById(tab.containerId)
    if (container) {
      container.remove()
    }

    if (saveTimers[tab.fileId]) {
      clearTimeout(saveTimers[tab.fileId])
      delete saveTimers[tab.fileId]
    }

    openTabs.value.splice(index, 1)

    let newActiveIndex = activeTabIndex.value
    if (openTabs.value.length === 0) {
      newActiveIndex = -1
    } else if (index < activeTabIndex.value) {
      newActiveIndex--
    } else if (index === activeTabIndex.value) {
      if (index >= openTabs.value.length) {
        newActiveIndex = openTabs.value.length - 1
      }
    }

    return { newActiveIndex, needSwitch: newActiveIndex !== activeTabIndex.value }
  }

  const closeOthers = async (exceptIndex) => {
    const tabsToClose = openTabs.value
      .map((tab, index) => ({ tab, index }))
      .filter(({ index }) => index !== exceptIndex)

    for (const { tab, index } of tabsToClose) {
      if (tab.isDirty) {
        try {
          await ElMessageBox.confirm(
            `文件 "${tab.fileName}" 有未保存的修改，确定要关闭吗？`,
            '提示',
            {
              confirmButtonText: '关闭',
              cancelButtonText: '取消',
              type: 'warning'
            }
          )
        } catch {
          continue
        }
      }

      if (tab.vditorInstance) {
        try {
          tab.vditorInstance.destroy()
        } catch (error) {
          console.warn('销毁 vditor 失败:', error)
        }
      }

      const container = document.getElementById(tab.containerId)
      if (container) {
        container.remove()
      }

      if (saveTimers[tab.fileId]) {
        clearTimeout(saveTimers[tab.fileId])
        delete saveTimers[tab.fileId]
      }
    }

    const exceptTab = openTabs.value[exceptIndex]
    openTabs.value = [exceptTab]
    activeTabIndex.value = 0
  }

  const closeAllTabs = async () => {
    const tabsToClose = [...openTabs.value]

    for (const tab of tabsToClose) {
      if (tab.isDirty) {
        try {
          await ElMessageBox.confirm(
            `文件 "${tab.fileName}" 有未保存的修改，确定要关闭吗？`,
            '提示',
            {
              confirmButtonText: '关闭',
              cancelButtonText: '取消',
              type: 'warning'
            }
          )
        } catch {
          continue
        }
      }

      if (tab.vditorInstance) {
        try {
          tab.vditorInstance.destroy()
        } catch (error) {
          console.warn('销毁 vditor 失败:', error)
        }
      }

      const container = document.getElementById(tab.containerId)
      if (container) {
        container.remove()
      }

      if (saveTimers[tab.fileId]) {
        clearTimeout(saveTimers[tab.fileId])
        delete saveTimers[tab.fileId]
      }
    }

    openTabs.value = []
    activeTabIndex.value = -1
  }

  const getTab = (index) => {
    return openTabs.value[index]
  }

  const getTabByFileId = (fileId) => {
    return openTabs.value.find((t) => t.fileId === fileId)
  }

  const updateTabContent = (fileId, content) => {
    const tab = getTabByFileId(fileId)
    if (tab) {
      tab.content = content
      tab.isDirty = content !== tab.lastSavedContent
    }
  }

  const markTabSaved = (fileId, newVersion) => {
    const tab = getTabByFileId(fileId)
    if (tab) {
      tab.version = newVersion
      tab.lastSavedContent = tab.content
      tab.isDirty = false
    }
  }

  const debouncedSave = (fileId, saveFn) => {
    const tab = getTabByFileId(fileId)
    if (!tab) return

    if (saveTimers[fileId]) {
      clearTimeout(saveTimers[fileId])
    }

    saveTimers[fileId] = setTimeout(() => {
      saveFn(fileId)
    }, 1000)
  }

  return {
    openTabs,
    activeTabIndex,
    openTab,
    switchTab,
    reorderTabs,
    closeTab,
    closeOthers,
    closeAllTabs,
    getTab,
    getTabByFileId,
    updateTabContent,
    markTabSaved,
    debouncedSave,
    saveTimers
  }
}
