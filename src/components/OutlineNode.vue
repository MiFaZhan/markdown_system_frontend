<template>
  <div class="outline-node">
    <div 
      class="outline-item"
      :class="{ 'has-children': node.children && node.children.length > 0 }"
      @click="handleClick"
    >
      <span 
        v-if="node.children && node.children.length > 0" 
        class="expand-icon"
        @click.stop="toggleExpand"
      >
        <svg 
          viewBox="0 0 24 24" 
          width="12" 
          height="12"
          :class="{ expanded: expanded }"
        >
          <path fill="currentColor" d="M8 5v14l11-7z"/>
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
  padding: 6px 8px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s, color 0.15s;
}

.outline-item:hover {
  background: var(--color-background-mute);
  color: var(--dr-accent, #409eff);
}

.outline-item.has-children {
  font-weight: 500;
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
  padding-left: 16px;
  border-left: 1px solid var(--color-border);
  margin-left: 7px;
}
</style>
