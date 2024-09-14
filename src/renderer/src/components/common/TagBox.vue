<script setup lang="ts">
import DoubleCheckTag from './DoubleCheckTag.vue'
import SelectItem from '../../model/util/SelectItem'
import { computed, Ref, ref, UnwrapRef } from 'vue'
import { notNullish } from '../../utils/CommonUtil'

// props
const props = defineProps<{
  load: () => Promise<unknown>
  showLoadButton?: boolean
}>()

// model
const dataList = defineModel<SelectItem[]>('dataList', { default: () => [] })

// 事件
const emit = defineEmits(['tagClicked'])

// 变量
// el-scrollbar组件的实例
const scrollbar = ref()
// el-row组件的实例
const dataRow = ref()
// loading开关
const loading: Ref<UnwrapRef<boolean>> = ref(false)
// 是否未填满
const notFull: Ref<UnwrapRef<boolean>> = computed(() => {
  if (notNullish(scrollbar.value) && notNullish(dataRow.value)) {
    const scrollHeight = scrollbar.value.wrapRef.clientHeight
    const dataRowHeight = dataRow.value.$el.clientHeight
    return dataRowHeight <= scrollHeight
  } else {
    return false
  }
})

// 方法
// 处理DataScroll滚动事件
async function handleDataScroll() {
  try {
    loading.value = true
    // 获得滚动条包裹的 ref 对象
    const scrollWrapper = scrollbar.value.wrapRef

    if (scrollWrapper) {
      const scrollHeight = scrollWrapper.scrollHeight
      const scrollTop = scrollWrapper.scrollTop
      const height = scrollWrapper.clientHeight

      // 判断是否滚动到底部
      if (scrollTop + height + 0.5 >= scrollHeight) {
        await props.load()
      }
    }
  } finally {
    loading.value = false
  }
}
// 处理tag被点击事件
function handleCheckTagClicked(tag: SelectItem) {
  emit('tagClicked', tag)
}

// 暴露
defineExpose({ scrollbar, notFull })
</script>

<template>
  <el-scrollbar
    ref="scrollbar"
    v-loading="loading"
    style="display: flex"
    @scroll="handleDataScroll"
  >
    <el-row ref="dataRow">
      <template v-for="item in dataList" :key="item.id">
        <div class="tag-box-select-item">
          <double-check-tag
            :item="item"
            @left-clicked="handleCheckTagClicked(item)"
            @right-clicked="handleCheckTagClicked(item)"
          >
          </double-check-tag>
        </div>
      </template>
    </el-row>
  </el-scrollbar>
  <el-row v-show="showLoadButton">
    <el-check-tag style="width: 100%" @click="props.load()"> 加载更多... </el-check-tag>
  </el-row>
</template>

<style scoped>
.tag-box-select-item {
  margin: 2px;
  word-break: break-all;
  word-wrap: break-word;
}
</style>
