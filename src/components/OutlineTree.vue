<template>
  <div class="outline-tree">
    <OutlineNode
      v-for="(node, index) in treeData"
      :key="index"
      :node="node"
      @click-heading="$emit('click-heading', $event)"
    />
    <div v-if="treeData.length === 0" class="outline-empty">暂无大纲</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import OutlineNode from './OutlineNode.vue'

const props = defineProps({
  outline: {
    type: Array,
    default: () => []
  }
})

defineEmits(['click-heading'])

// 将扁平的标题列表转换为树形结构
const treeData = computed(() => {
  const items = props.outline
  if (!items.length) return []

  const root = []
  const stack = [{ level: 0, children: root }]

  for (const item of items) {
    const node = {
      ...item,
      children: [],
      expanded: true
    }

    // 找到合适的父节点
    while (stack.length > 1 && stack[stack.length - 1].level >= item.level) {
      stack.pop()
    }

    stack[stack.length - 1].children.push(node)
    stack.push({ level: item.level, children: node.children })
  }

  return root
})
</script>

<style scoped>
.outline-tree {
  padding: 4px 0;
}

.outline-empty {
  color: var(--color-text-secondary);
  font-size: 13px;
  text-align: center;
  padding: 20px;
}
</style>
