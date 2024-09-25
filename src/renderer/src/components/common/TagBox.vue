<script setup lang="ts">
import DoubleCheckTag from './DoubleCheckTag.vue'
import SelectItem from '../../model/util/SelectItem'
import { nextTick, Ref, ref, UnwrapRef, watch } from 'vue'
import { isNullish, notNullish } from '../../utils/CommonUtil'

// props
const props = defineProps<{
  load?: () => Promise<unknown>
  showLoadButton?: boolean
}>()

// model
const dataList = defineModel<SelectItem[]>('dataList', { default: () => [] })

// 事件
const emit = defineEmits(['tagLeftClicked', 'tagRightClicked'])

// watch
// 监听dataList变化，更新是否充满的状态
watch(
  dataList,
  () => {
    nextTick(() => {
      if (notNullish(scrollbar.value) && notNullish(dataRow.value)) {
        const scrollHeight = scrollbar.value.wrapRef.clientHeight
        const dataRowHeight = dataRow.value.$el.offsetHeight
        notFull.value = dataRowHeight <= scrollHeight + 16 // 滚动条高度加上加载按钮的16px
      } else {
        notFull.value = true
      }
    })
  },
  { deep: true }
)

// 变量
// el-scrollbar组件的实例
const scrollbar = ref()
// el-row组件的实例
const dataRow = ref()
// loading开关
const loading: Ref<UnwrapRef<boolean>> = ref(false)
// 是否未填满
const notFull: Ref<UnwrapRef<boolean>> = ref(true)

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
      if (scrollTop + height + 0.5 >= scrollHeight) {
        await props.load()
      }
    }
  } finally {
    loading.value = false
  }
}
// 处理tag被点击事件
function handleCheckTagClicked(tag: SelectItem, left: boolean) {
  if (left) {
    emit('tagLeftClicked', tag)
  } else {
    emit('tagRightClicked', tag)
  }
}

// 暴露
defineExpose({ scrollbar, notFull })
</script>

<template>
  <div class="tag-box-wrapper">
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
              @left-clicked="handleCheckTagClicked(item, true)"
              @right-clicked="handleCheckTagClicked(item, false)"
            >
            </double-check-tag>
          </div>
        </template>
      </el-row>
    </el-scrollbar>
    <el-check-tag
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
  height: 16px;
}
.tag-box-hide-load-more {
  height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
