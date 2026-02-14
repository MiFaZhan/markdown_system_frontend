<template>
  <div class="projects-grid">
    <ProjectCard
      v-for="project in projects"
      :key="project.id"
      :project="project"
      @click="$emit('enterProject', project)"
      @edit="$emit('editProject', project)"
      @delete="$emit('deleteProject', project)"
      @view="$emit('viewProperty', project)"
    />
  </div>
</template>

<script setup>
import ProjectCard from './ProjectCard.vue'

defineProps({
  projects: {
    type: Array,
    default: () => []
  }
})

defineEmits(['enterProject', 'editProject', 'deleteProject', 'viewProperty'])
</script>

<style scoped>
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 30px;
  padding: 16px;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .projects-grid {
    grid-template-columns: 1fr;
  }
}
</style>
