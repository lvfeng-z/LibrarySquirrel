<script setup lang="ts">
import { InputBox } from '../../model/util/InputBox'
import { onBeforeMount, ref, Ref, UnwrapRef } from 'vue'
import ScrollTextBox from './ScrollTextBox.vue'
import CommonInput from './CommentInput/CommonInput.vue'
import lodash from 'lodash'
import CollapsePanel from '@renderer/components/common/CollapsePanel.vue'

// props
const props = withDefaults(
  defineProps<{
    inputBoxes: InputBox[] // InputBox数组
    reverse?: boolean // 是否翻转DropDownTable（true：翻转，false：不翻转）
  }>(),
  {
    reverse: false
  }
)

// model
const formData = defineModel<object>('formData', { default: {}, required: true }) // 表单数据

// onBeforeMount
onBeforeMount(() => {
  calculateSpan()
})

// 暴露
defineExpose({
  changeState
})

// 变量
const state: Ref<UnwrapRef<boolean>> = ref(false) // 开关状态
const inputBoxInRow: Ref<UnwrapRef<InputBox[][]>> = ref([]) // InputBox分行数组
const dropdownTableHeight = ref(0) // 弃用 所有行占用的高度

// 方法
// 开启/关闭下拉表单
function changeState(newState?: boolean) {
  if (newState === undefined) {
    state.value = !state.value
  } else {
    state.value = newState
  }
}

// 处理InputBox布局
function calculateSpan() {
  // 一行的高度
  const rowHeight = 42
  let height = 0
  // 用于计算当前行在插入box之后还剩多少span
  let spanRest = 24
  // 临时用于储存行信息的数组
  let tempRow: InputBox[] = []
  inputBoxInRow.value.push(tempRow)
  height += rowHeight

  // 遍历box数组，处理如何分布这些box
  for (const inputBox of props.inputBoxes) {
    // 储存当前box的长度
    let boxSpan = 0
    // 不更改props属性
    const tempInputBox: InputBox = lodash.cloneDeep(inputBox)
    // 未设置tag长度则设置为2
    if (tempInputBox.labelSpan == undefined) {
      tempInputBox.labelSpan = 2
    }
    // 未设置input长度则设置为6
    if (tempInputBox.inputSpan == undefined) {
      tempInputBox.inputSpan = 4
    }

    // 判断是否能够容纳此box
    boxSpan += tempInputBox.labelSpan + tempInputBox.inputSpan
    spanRest -= boxSpan

    if (spanRest >= 0) {
      tempRow.push(tempInputBox)
    } else {
      tempRow = []
      inputBoxInRow.value.push(tempRow)
      height += rowHeight
      tempRow.push(tempInputBox)
      spanRest = 24 - boxSpan
    }
  }

  // 计算完的高度赋值
  dropdownTableHeight.value = height
}
</script>

<template>
  <collapse-panel :reverse="props.reverse" height="150px">
    <el-scrollbar class="dropdown-table-rows">
      <el-form v-model="formData">
        <template v-for="(boxRow, boxRowindex) in inputBoxInRow" :key="boxRowindex">
          <el-row class="dropdown-table-row">
            <template v-for="(item, index) in boxRow" :key="index">
              <el-col class="dropdown-table-label" :span="item.labelSpan">
                <div
                  :key="boxRowindex + '-' + index"
                  class="dropdown-table-label-scroll-text-wrapper el-tag-mimic"
                  style="width: 100%"
                >
                  <scroll-text-box class="dropdown-table-label-scroll-text">{{ item.label }}</scroll-text-box>
                </div>
              </el-col>
              <el-col class="dropdown-table-input" :span="item.inputSpan">
                <el-form-item class="dropdown-table-input-form-item">
                  <common-input
                    v-model:data="formData[item.name]"
                    class="search-toolbar-input-form-item-input"
                    :config="item"
                  ></common-input>
                </el-form-item>
              </el-col>
            </template>
          </el-row>
        </template>
      </el-form>
    </el-scrollbar>
  </collapse-panel>
</template>

<style scoped>
.dropdown-table-row {
  height: 32px;
  margin-top: 3px;
}
.dropdown-table-label {
  height: 100%;
  display: flex;
  justify-content: flex-end;
}
.dropdown-table-input {
  height: 100%;
  display: flex;
  justify-content: flex-start;
}
.dropdown-table-input-form-item {
  width: 100%;
  height: 100%;
}
.search-toolbar-input-form-item-input {
  width: 100%;
  height: 100%;
}
.dropdown-table-rows {
  flex-direction: column;
  background-color: white;
  padding: 7px;
  height: calc(100% - 14px);
}
.dropdown-table-label-scroll-text {
  width: 100%;
  height: 100%;
}
</style>
