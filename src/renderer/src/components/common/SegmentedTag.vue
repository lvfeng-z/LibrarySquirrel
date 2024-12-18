<script setup lang="ts">
import SelectItem from '@renderer/model/util/SelectItem.ts'
import { Close } from '@element-plus/icons-vue'
import { computed, ref, Ref, UnwrapRef } from 'vue'
import { isNullish, notNullish } from '@renderer/utils/CommonUtil.ts'

// props
const props = withDefaults(
  defineProps<{
    item: SelectItem
    closeable?: boolean
    onChecked?: (check?: boolean, value?: SelectItem) => void
  }>(),
  {
    closeable: true
  }
)

// 变量
const subLabelsLength: Ref<UnwrapRef<number>> = computed(() => {
  return isNullish(props.item.subLabels) ? 0 : props.item.subLabels.length
})
const tagLabelWrapperMaxWidth: Ref<UnwrapRef<string>> = computed(() => {
  return props.closeable ? 'calc(100% - 21px)' : '100%'
})
const checked: Ref<UnwrapRef<boolean>> = ref(true)

// 事件
const emits = defineEmits(['clicked', 'mainLabelClicked', 'subLabelClicked', 'close'])

// 方法
// 处理点击事件
function handleClicked() {
  emits('clicked')
}
function handleMainLabelClicked() {
  emits('mainLabelClicked')
}
function handleSubLabelClicked(index: number) {
  emits('subLabelClicked', index)
}
function handleCloseButtonClicked() {
  emits('close')
}
// 改变勾选状态
function check(newState: boolean) {
  checked.value = newState
  if (notNullish(props.onChecked)) {
    props.onChecked(newState, props.item)
  }
}

// 暴露
defineExpose({ check })
</script>

<template>
  <div class="segmented-tag" @click="handleClicked">
    <div class="segmented-tag-label-wrapper">
      <div
        :class="{
          'segmented-tag-main-label': true,
          'segmented-tag-main-label-checked': checked,
          'segmented-tag-main-label-unchecked': !checked
        }"
        @click="handleMainLabelClicked"
      >
        <span
          :class="{
            'segmented-tag-main-text': true,
            'segmented-tag-ellipsis': true,
            'segmented-tag-main-text-checked': checked,
            'segmented-tag-main-text-unchecked': !checked
          }"
          >{{ props.item.label }}</span
        >
      </div>
      <template v-for="(item, index) of props.item.subLabels" :key="index">
        <div
          :class="{
            'segmented-tag-sub-label': true,
            'segmented-tag-sub-label-dark': !(index % 2 === 0),
            'segmented-tag-sub-label-light': index % 2 === 0
          }"
          @click="handleSubLabelClicked(index)"
        >
          <span class="segmented-tag-sub-text segmented-tag-ellipsis">{{ item }}</span>
        </div>
      </template>
    </div>
    <div
      v-if="closeable"
      :class="{
        'segmented-tag-sub-close-wrapper': true,
        'segmented-tag-sub-label-dark': subLabelsLength % 2 === 0,
        'segmented-tag-sub-label-light': !(subLabelsLength % 2 === 0)
      }"
    >
      <button class="segmented-tag-sub-close" @click="handleCloseButtonClicked">
        <el-icon color="rgb(166.2, 168.6, 173.4, 75%)"><Close /></el-icon>
      </button>
    </div>
  </div>
</template>

<style scoped>
.segmented-tag {
  width: auto;
  display: flex;
  flex-direction: row;
  justify-content: space-between; /* 在一行时左右对齐，换行时每个标签独占一行 */
  border-radius: 10px;
  max-width: 100%;
  cursor: pointer; /* 鼠标悬停时显示为手型指针 */
  overflow: hidden;
}
.segmented-tag-label-wrapper {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: v-bind(tagLabelWrapperMaxWidth);
}
.segmented-tag-main-label {
  max-width: 100%;
  flex-grow: 1;
  align-content: center;
  transition-duration: 0.4s;
}
.segmented-tag-main-label-checked {
  background-color: rgb(133.4, 206.2, 97.4, 30%);
}
.segmented-tag-main-label-checked:hover {
  background-color: rgb(133.4, 206.2, 97.4, 15%);
}
.segmented-tag-main-label-unchecked {
  background-color: rgb(166.2, 168.6, 173.4, 30%);
}
.segmented-tag-main-label-unchecked:hover {
  background-color: rgb(166.2, 168.6, 173.4, 10%);
}
.segmented-tag-main-text {
  max-width: 100%;
  margin-left: 6px;
  margin-right: 3px;
  font-weight: bolder;
  text-align: center;
}
.segmented-tag-main-text-checked {
  color: rgb(78.1, 141.8, 46.6, 75%);
}
.segmented-tag-main-text-unchecked {
  color: rgb(166.2, 168.6, 173.4, 100%);
}
.segmented-tag-sub-label {
  display: flex;
  flex-grow: 1;
  transition-duration: 0.4s;
}
.segmented-tag-sub-label-dark {
  background-color: rgb(166.2, 168.6, 173.4, 30%);
}
.segmented-tag-sub-label-dark:hover {
  background-color: rgb(166.2, 168.6, 173.4, 10%);
}
.segmented-tag-sub-label-light {
  background-color: rgb(166.2, 168.6, 173.4, 20%);
}
.segmented-tag-sub-label-light:hover {
  background-color: rgb(166.2, 168.6, 173.4, 10%);
}
.segmented-tag-sub-text {
  width: 100%;
  margin-left: 3px;
  margin-right: 3px;
  font-weight: inherit;
  text-align: center;
  color: rgb(166.2, 168.6, 173.4, 100%);
}
.segmented-tag-sub-close-wrapper {
  display: flex;
  align-items: center;
}
.segmented-tag-sub-close {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 设置宽度和高度相等，以确保按钮是正圆 */
  width: 15px;
  height: 15px;
  margin-left: 3px;
  margin-right: 3px;

  /* 圆角半径设置为50%以形成圆形 */
  border-radius: 50%;

  background-color: rgb(255, 255, 255, 0); /* 背景 */
  border: none; /* 无边框 */
  cursor: pointer; /* 鼠标悬停时显示为手型指针 */

  transition-duration: 0.4s;
}
.segmented-tag-sub-close:hover {
  background-color: rgb(166.2, 168.6, 173.4, 30%);
}
.segmented-tag-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
</style>
