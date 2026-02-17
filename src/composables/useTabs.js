import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

export function useTabs({ onSwitch, onSave }) {
  const openTabs = ref([])
  const activeTabIndex = ref(-1)
  const saveTimers = ref({})

  const createTab = (file, contentData, projectId) => {
    return {
      fileId: file.id,
      projectId: projectId,
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

  const openTab = async (file, contentData, projectId) => {
    const existingIndex = openTabs.value.findIndex((tab) => tab.fileId === file.id)
    if (existingIndex !== -1) {
      const result = switchTab(existingIndex)
      onSwitch(result)
      return
    }

    if (openTabs.value.length >= 10) {
      ElMessage.warning('最多同时打开 10 个标签')
      return
    }

    const newTab = createTab(file, contentData, projectId)
    openTabs.value.push(newTab)

    const newIndex = openTabs.value.length - 1
    activeTabIndex.value = newIndex
    onSwitch({ needInit: true, tab: newTab, index: newIndex })

    return newTab
  }

  const switchTab = (index) => {
    if (index < 0 || index >= openTabs.value.length) {
      return { tab: null, index: -1 }
    }
    if (index === activeTabIndex.value) {
      const targetTab = openTabs.value[index]
      return { tab: targetTab, index, needInit: false }
    }

    if (activeTabIndex.value >= 0) {
      const currentTab = openTabs.value[activeTabIndex.value]
      if (currentTab?.vditorInstance) {
        const currentContainer = document.getElementById(currentTab.containerId)
        if (currentContainer) {
          currentContainer.style.display = 'none'
        }
      }
    }

    activeTabIndex.value = index
    const targetTab = openTabs.value[index]

    if (!targetTab.isInitialized) {
      return { needInit: true, tab: targetTab, index }
    } else {
      const targetContainer = document.getElementById(targetTab.containerId)
      if (targetContainer) {
        targetContainer.style.display = 'block'
      }
    }

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
      } catch (error) {}
    }

    const container = document.getElementById(tab.containerId)
    if (container) {
      container.remove()
    }

    if (saveTimers.value[tab.fileId]) {
      clearTimeout(saveTimers.value[tab.fileId])
      delete saveTimers.value[tab.fileId]
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
        } catch (error) {}
      }

      const container = document.getElementById(tab.containerId)
      if (container) {
        container.remove()
      }

      if (saveTimers.value[tab.fileId]) {
        clearTimeout(saveTimers.value[tab.fileId])
        delete saveTimers.value[tab.fileId]
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
        } catch (error) {}
      }

      const container = document.getElementById(tab.containerId)
      if (container) {
        container.remove()
      }

      if (saveTimers.value[tab.fileId]) {
        clearTimeout(saveTimers.value[tab.fileId])
        delete saveTimers.value[tab.fileId]
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

    if (saveTimers.value[fileId]) {
      clearTimeout(saveTimers.value[fileId])
    }

    saveTimers.value[fileId] = setTimeout(() => {
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
