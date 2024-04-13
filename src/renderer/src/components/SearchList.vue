<template>
  <div class="search-list">
    <div class="search-list-wrapper">
      <label v-if="props.title !== null && props.title !== ''">{{ props.title }}</label>
      <el-input
        v-model="searchText"
        placeholder="请输入关键词进行搜索"
        prefix-icon="el-icon-search"
        @input="handleSearch"
      />
      <div class="result-list">
        <el-checkbox-group v-if="multiSelect" v-model="selectedItems">
          <el-checkbox v-for="(item, index) in filteredItems" :key="index" :value="item.value">
            {{ item.label }}
          </el-checkbox>
        </el-checkbox-group>

        <el-radio-group v-else v-model="selectedItem">
          <el-radio v-for="(item, index) in filteredItems" :key="index" :value="item.value">
            {{ item.label }}
          </el-radio>
        </el-radio-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, UnwrapRef } from 'vue'

type Item = { value: string; label: string; extraData: object }

const props = defineProps<{
  title?: string
  multiSelect: boolean
  searchApi: (args: string) => Promise<never> // 修改这里，定义tagLocalQuery prop类型
}>()

const searchText = ref('')
const selectedItems = ref([])
const selectedItem = ref(null)
const filteredItems: Ref<UnwrapRef<Item[]>> = ref([])

async function handleSearch() {
  const a = await props.searchApi(searchText.value)
  filteredItems.value = a
  console.log('a:', a)
}

</script>

<style scoped>
.search-list {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.search-list-wrapper{
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  display: flex;
  flex-direction: column;
}

.result-list {
  margin-top: 16px;
  width: 100%;
  height: 100%;
}
</style>
