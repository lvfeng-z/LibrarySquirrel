<template>
  <div class="search-list">
    <el-input
      v-model="searchText"
      placeholder="请输入关键词进行搜索"
      prefix-icon="el-icon-search"
      @input="handleSearch"
    />

    <div class="result-list">
      <el-checkbox-group v-if="multiSelect" v-model="selectedItems">
        <el-checkbox v-for="(item, index) in filteredItems" :key="index" :label="item.id">
          {{ item.label }}
        </el-checkbox>
      </el-checkbox-group>

      <el-radio-group v-else v-model="selectedItem">
        <el-radio v-for="(item, index) in filteredItems" :key="index" :label="item.id">
          {{ item.label }}
        </el-radio>
      </el-radio-group>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'

export default defineComponent({
  props: {
    data: {
      type: Array,
      required: true
    },
    multiSelect: {
      type: Boolean,
      default: false
    },
    remoteSearchFn: {
      type: Function,
      required: true
    }
  },
  setup(props) {
    const searchText = ref('')
    const selectedItems = ref([])
    const selectedItem = ref(null)
    const filteredItems = ref([])

    const handleSearch = async () => {
      filteredItems.value = await props.remoteSearchFn(searchText.value)
    }

    return {
      searchText,
      selectedItems,
      selectedItem,
      filteredItems,
      handleSearch
    }
  }
})
</script>

<style scoped>
.search-list {
  display: flex;
  flex-direction: column;
}

.result-list {
  margin-top: 16px;
}
</style>
