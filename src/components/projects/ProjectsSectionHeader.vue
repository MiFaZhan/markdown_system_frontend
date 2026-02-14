<template>
  <div class="section-header">
    <h2 class="section-title">我的项目</h2>
    <el-button type="primary" :icon="Plus" class="create-btn" @click="$emit('createProject')" />
    <div class="section-controls">
      <el-select
        :model-value="sortField"
        placeholder="排序字段"
        style="width: 120px"
        @update:model-value="$emit('update:sortField', $event)"
        @change="$emit('handleSortChange')"
      >
        <el-option label="创建时间" value="creation_time" />
        <el-option label="更新时间" value="update_time" />
        <el-option label="项目名称" value="project_name" />
      </el-select>
      <el-select
        :model-value="sortOrder"
        placeholder="排序方向"
        style="width: 100px"
        @update:model-value="$emit('update:sortOrder', $event)"
        @change="$emit('handleSortChange')"
      >
        <el-option label="升序" value="asc" />
        <el-option label="降序" value="desc" />
      </el-select>
    </div>
    <div class="search-input">
      <el-input
        :model-value="searchKeyword"
        placeholder="搜索项目名称"
        :prefix-icon="Search"
        clearable
        style="width: 200px"
        @update:model-value="$emit('update:searchKeyword', $event)"
        @input="$emit('update:searchKeyword', $event)"
      />
    </div>
    <div class="view-controls">
      <el-button-group>
        <el-button
          :type="viewMode === 'card' ? 'primary' : ''"
          :icon="Grid"
          size="small"
          @click="$emit('update:viewMode', 'card')"
        >
          卡片
        </el-button>
        <el-button
          :type="viewMode === 'list' ? 'primary' : ''"
          :icon="List"
          size="small"
          @click="$emit('update:viewMode', 'list')"
        >
          列表
        </el-button>
      </el-button-group>
    </div>
  </div>
</template>

<script setup>
import { Plus, Grid, List, Search } from '@element-plus/icons-vue'

defineProps({
  viewMode: {
    type: String,
    default: 'card'
  },
  sortField: {
    type: String,
    default: 'creation_time'
  },
  sortOrder: {
    type: String,
    default: 'asc'
  },
  searchKeyword: {
    type: String,
    default: ''
  }
})

defineEmits([
  'update:viewMode',
  'update:sortField',
  'update:sortOrder',
  'update:searchKeyword',
  'handleSortChange',
  'createProject'
])
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 30px;
}

.section-title {
  margin: 0;
  color: var(--color-heading);
}

.section-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.create-btn {
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 6px;
  height: 28px;
}

.view-controls {
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .section-header {
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .section-title {
    font-size: 20px;
  }

  .search-input {
    order: 10;
    width: 100%;
    margin-left: 0;
    margin-top: 4px;
  }

  .search-input .el-input {
    width: 100% !important;
  }

  .section-controls {
    flex: 1;
    justify-content: flex-end;
    min-width: auto;
  }

  .section-controls .el-select {
    width: 90px !important;
  }

  .view-controls {
    margin-left: 0;
  }

  .view-controls .el-button span {
    display: none;
  }

  .view-controls .el-button {
    padding: 8px !important;
  }

  @media (max-width: 495px) {
    .section-header {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-areas:
        'title create'
        'controls view'
        'search search';
      gap: 12px;
      align-items: center;
    }

    .section-title {
      grid-area: title;
    }

    .create-btn {
      grid-area: create;
      justify-self: end;
    }

    .section-controls {
      grid-area: controls;
      justify-content: flex-start;
      flex: initial;
    }

    .section-controls .el-select {
      width: 85px !important;
    }

    .view-controls {
      grid-area: view;
      justify-self: end;
      margin-left: 0;
    }

    .search-input {
      grid-area: search;
      width: 100%;
      margin-top: 0;
      order: unset;
    }
  }
}
</style>
