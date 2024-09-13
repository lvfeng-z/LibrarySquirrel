<script setup lang="ts">
import DoubleCheckTag from './DoubleCheckTag.vue'
import SelectItem from '../../model/util/SelectItem'

// props
const props = defineProps<{
  load?: () => void
}>()

// model
const dataList = defineModel<SelectItem[]>('dataList', { default: () => [] })

// 事件
const emit = defineEmits(['tagClicked'])

// 方法
function handleCheckTagClicked(tag: SelectItem) {
  emit('tagClicked', tag)
}
</script>

<template>
  <el-scrollbar ref="lowerScroll" v-infinite-scroll="props.load">
    <el-row class="exchange-box-lower-data-scroll-row">
      <template v-for="tag in dataList" :key="tag.id">
        <div class="exchange-box-upperLower-data-item">
          <double-check-tag
            :item="tag"
            @left-clicked="handleCheckTagClicked(tag)"
            @right-clicked="handleCheckTagClicked(tag)"
          />
        </div>
      </template>
    </el-row>
  </el-scrollbar>
</template>

<style scoped>
.exchange-box-upperLower-data-item {
  margin: 2px;
  word-break: break-all;
  word-wrap: break-word;
}
</style>
