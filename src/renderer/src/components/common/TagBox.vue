<script setup lang="ts">
import SelectItem from '../../model/util/SelectItem'
import { nextTick, Ref, ref, UnwrapRef, watch } from 'vue'
import { arrayNotEmpty, isNullish, notNullish } from '../../utils/CommonUtil'
import SegmentedTag from '@renderer/components/common/SegmentedTag.vue'
import IPage from '@renderer/model/util/IPage.ts'
import BaseQueryDTO from '@renderer/model/main/queryDTO/BaseQueryDTO.ts'
import Page from '@renderer/model/util/Page.ts'
import lodash from 'lodash'

// props
const props = withDefaults(
  defineProps<{
    load?: (page: IPage<BaseQueryDTO, SelectItem>) => Promise<IPage<BaseQueryDTO, SelectItem>>
    tagCloseable?: boolean
    tagsGap?: string
    maxHeight?: string
  }>(),
  {
    tagCloseable: false,
    tagsGap: '5px',
    maxHeight: 'none'
  }
)

// model
// 分页参数
const page = defineModel<IPage<BaseQueryDTO, SelectItem>>('page', { default: new Page<BaseQueryDTO, SelectItem>() })
// 数据列表
const data = defineModel<SelectItem[]>('data', { default: [] })

// 事件
const emit = defineEmits(['tagClicked', 'tagMainLabelClicked', 'tagSubLabelClicked', 'tagClose'])

// 变量
// el-scrollbar组件的实例
const scrollbar = ref()
// el-row组件的实例
const container = ref()
// 加载按钮的实例
const loadMoreButton = ref()
// loading开关
const loading: Ref<UnwrapRef<boolean>> = ref(false)
// 显示加载按钮
const showLoadButton: Ref<UnwrapRef<boolean>> = ref(false)
// 是否有下一页
const hasNextPage: Ref<UnwrapRef<boolean>> = ref(false)

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
        await nextPage(false)
      }
    }
  } finally {
    loading.value = false
  }
}
// 处理DataScroll滚动事件
async function nextPage(newSearch: boolean) {
  if (notNullish(props.load)) {
    // 新查询重置查询条件
    if (newSearch) {
      page.value.pageNumber = 1
      data.value.length = 0
    } else {
      page.value.pageNumber++
    }

    nextTick().then(async () => {
      if (notNullish(props.load)) {
        //查询
        const tempPage = lodash.cloneDeep(page.value)
        tempPage.data = undefined
        const nextPage = await props.load(tempPage)

        // 新数据加入到分页数据中
        page.value.pageCount = nextPage.pageCount
        page.value.dataCount = nextPage.dataCount
        if (nextPage.pageNumber <= nextPage.pageCount) {
          hasNextPage.value = nextPage.pageNumber !== nextPage.pageCount
          if (arrayNotEmpty(nextPage.data)) {
            data.value.push(...nextPage.data)
          } else {
            refreshLoadButton()
          }
        } else {
          // 如果当前页超过总页数，当前页设为最大页数
          page.value.pageNumber = nextPage.pageCount <= 0 ? 1 : nextPage.pageCount
          hasNextPage.value = false
          refreshLoadButton()
        }
      }
    })
  }
}
async function newSearch() {
  return nextPage(true)
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
// 刷新加载按钮状态
function refreshLoadButton() {
  let notFull: boolean
  if (notNullish(scrollbar.value) && notNullish(container.value)) {
    const scrollHeight = scrollbar.value.wrapRef.clientHeight
    const containerHeight = container.value.offsetHeight
    const loadMoreButtonHeight = loadMoreButton.value.$el.clientHeight
    notFull = containerHeight <= scrollHeight + loadMoreButtonHeight
  } else {
    notFull = true
  }
  showLoadButton.value = hasNextPage.value && notFull
}

// watch
// 监听data变化，刷新加载按钮状态
watch(data, () => nextTick(() => refreshLoadButton()), { deep: true })

// 暴露
defineExpose({ scrollbar, newSearch })
</script>

<template>
  <div class="tag-box-wrapper">
    <el-scrollbar ref="scrollbar" v-loading="loading" @scroll="handleDataScroll">
      <div class="tag-box-item-container" ref="container">
        <slot name="head" />
        <segmented-tag
          v-for="item in data"
          :key="item.value"
          :item="item"
          :closeable="tagCloseable"
          @clicked="handleTagClicked(item)"
          @main-label-clicked="handleTagMainLabelClicked(item)"
          @sub-label-clicked="(event) => handleTagSubLabelClicked(item, event)"
          @close="handleTagClose(item)"
        />
        <slot name="tail" />
      </div>
    </el-scrollbar>
    <el-check-tag
      ref="loadMoreButton"
      :class="{
        'tag-box-load-more': true,
        'tag-box-show-load-more': showLoadButton,
        'tag-box-hide-load-more': !showLoadButton
      }"
      @click="nextPage(false)"
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
.tag-box-load-more {
  transition:
    height 0.3s ease,
    padding 0.3s ease;
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
.tag-box-item-container {
  align-items: center;
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: v-bind(tagsGap);
  min-width: 0;
  position: relative;
  margin: 3px;
}
:deep(.el-scrollbar__wrap) {
  max-height: v-bind(maxHeight);
}
</style>
