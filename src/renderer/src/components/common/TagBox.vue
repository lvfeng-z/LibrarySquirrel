<script setup lang="ts">
import SelectItem from '../../model/util/SelectItem'
import { nextTick, Ref, ref, UnwrapRef, watch } from 'vue'
import { isNullish, notNullish } from '../../utils/CommonUtil'
import SegmentedTag from '@renderer/components/common/SegmentedTag.vue'

// props
const props = withDefaults(
  defineProps<{
    load?: () => Promise<unknown>
    hasNextPage?: boolean
    tagCloseable?: boolean
  }>(),
  {
    tagCloseable: false
  }
)

// model
const dataList = defineModel<SelectItem[]>('dataList', { default: () => [] })

// 事件
const emit = defineEmits(['tagClicked', 'tagMainLabelClicked', 'tagSubLabelClicked', 'tagClose'])

// watch
// 监听dataList变化，更新是否充满的状态
watch(
  dataList,
  () => {
    nextTick(() => {
      let notFull: boolean
      if (notNullish(scrollbar.value) && notNullish(dataRow.value)) {
        const scrollHeight = scrollbar.value.wrapRef.clientHeight
        const dataRowHeight = dataRow.value.$el.offsetHeight
        const loadMoreButtonHeight = loadMoreButton.value.$el.clientHeight
        notFull = dataRowHeight <= scrollHeight + loadMoreButtonHeight
      } else {
        notFull = true
      }
      showLoadButton.value = props.hasNextPage && notFull
    })
  },
  { deep: true }
)

// 变量
// el-scrollbar组件的实例
const scrollbar = ref()
// el-row组件的实例
const dataRow = ref()
// 加载按钮的实例
const loadMoreButton = ref()
// loading开关
const loading: Ref<UnwrapRef<boolean>> = ref(false)
// 显示加载按钮
const showLoadButton: Ref<UnwrapRef<boolean>> = ref(false)

// 方法
// 处理DataScroll滚动事件
async function handleDataScroll() {
  try {
    if (isNullish(props.load)) {
      return
    }
    loading.value = true
    // 获得滚动条包裹的 ref 对象
    const scrollWrapper = scrollbar.value.wrapRef

    if (scrollWrapper) {
      const scrollHeight = scrollWrapper.scrollHeight
      const scrollTop = scrollWrapper.scrollTop
      const height = scrollWrapper.clientHeight

      // 判断是否滚动到底部
      if (scrollTop + height + 1 >= scrollHeight) {
        await props.load()
      }
    }
  } finally {
    loading.value = false
  }
}
// 处理tag被点击事件
function handleTagClicked(tag: SelectItem) {
  emit('tagClicked', tag)
}
function handleTagMainLabelClicked(tag: SelectItem) {
  emit('tagMainLabelClicked', tag)
}
function handleTagSubLabelClicked(tag: SelectItem, index: number) {
  emit('tagSubLabelClicked', tag, index)
}
function handleTagClose(tag: SelectItem) {
  emit('tagClose', tag)
}

// 暴露
defineExpose({ scrollbar })
</script>

<template>
  <div class="tag-box-wrapper">
    <el-scrollbar ref="scrollbar" v-loading="loading" style="display: flex" @scroll="handleDataScroll">
      <div class="data-row" ref="dataRow">
        <segmented-tag
          v-for="(item, index) in dataList"
          :key="index"
          :item="item"
          :closeable="tagCloseable"
          @clicked="handleTagClicked(item)"
          @main-label-clicked="handleTagMainLabelClicked(item)"
          @sub-label-clicked="(event) => handleTagSubLabelClicked(item, event)"
          @close="handleTagClose(item)"
        />
      </div>
    </el-scrollbar>
    <el-check-tag
      ref="loadMoreButton"
      :class="{
        'tag-box-load-more': true,
        'tag-box-show-load-more': showLoadButton,
        'tag-box-hide-load-more': !showLoadButton
      }"
      @click="notNullish(props.load) ? props.load() : undefined"
    >
      加载更多...
    </el-check-tag>
  </div>
</template>

<style scoped>
.tag-box-wrapper {
  display: flex;
  flex-direction: column;
}
.tag-box-select-item {
  margin: 2px;
  word-break: break-all;
  word-wrap: break-word;
}
.tag-box-load-more {
  transition:
    height 0.5s ease,
    padding 0.5s ease;
  overflow: hidden;
}
.tag-box-show-load-more {
  padding-top: 6px;
  padding-bottom: 6px;
}
.tag-box-hide-load-more {
  height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.data-row {
  align-items: center;
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 5px;
  min-width: 0;
  position: relative;
}
</style>
