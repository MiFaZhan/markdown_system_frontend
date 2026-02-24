<template>
  <div class="outline-node">
    <div
      class="outline-item"
      :class="{ 'has-children': node.children && node.children.length > 0 }"
      :data-level="node.level"
      @click="handleClick"
    >
      <span
        v-if="node.children && node.children.length > 0"
        class="expand-icon"
        @click.stop="toggleExpand"
      >
        <svg viewBox="0 0 24 24" width="12" height="12" :class="{ expanded: expanded }">
          <path fill="currentColor" d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span class="item-text">{{ node.text }}</span>
    </div>

    <div v-if="node.children && node.children.length > 0 && expanded" class="outline-children">
      <OutlineNode
        v-for="(child, index) in node.children"
        :key="index"
        :node="child"
        @click-heading="$emit('click-heading', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click-heading'])

const expanded = ref(true)

const toggleExpand = () => {
  expanded.value = !expanded.value
}

const handleClick = () => {
  emit('click-heading', props.node)
}
</script>

<style scoped>
.outline-node {
  user-select: none;
}

.outline-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
  cursor: pointer;
  border-radius: 4px;
  transition:
    background-color 0.15s,
    color 0.15s;
  margin-bottom: 2px;
}

.outline-item:hover {
  background: var(--color-background-soft);
  color: var(--el-color-primary);
}

.outline-item.has-children {
  font-weight: 500;
}

/* 不同级别标题的字体大小 */
.outline-item[data-level='1'] {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.outline-item[data-level='2'] {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.outline-item[data-level='3'] {
  font-size: 13px;
  font-weight: 400;
  color: var(--el-text-color-regular);
}

.outline-item[data-level='4'] {
  font-size: 13px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.outline-item[data-level='5'] {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.outline-item[data-level='6'] {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  color: var(--color-text-secondary);
  transition: transform 0.2s;
}

.expand-icon svg {
  transition: transform 0.2s;
}

.expand-icon svg.expanded {
  transform: rotate(90deg);
}

.item-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-children {
  padding-left: 14px;
  border-left: 1px solid var(--el-border-color-lighter);
  margin-left: 6px;
}
</style>
