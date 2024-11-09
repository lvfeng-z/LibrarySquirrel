<script setup lang="ts">
import { InputBox } from '../../model/util/InputBox'
import ScrollTextBox from './ScrollTextBox.vue'
import { onBeforeMount, ref, Ref, UnwrapRef } from 'vue'
import BaseFormDialog from './BaseFormDialog.vue'
import DialogMode from '../../model/util/DialogMode'
import lodash from 'lodash'
// props
const props = defineProps<{
  mode: DialogMode
  inputBoxes?: InputBox[] // InputBox数组
}>()

// onBeforeMount
onBeforeMount(() => {
  calculateSpan()
})

// 变量
const inputBoxInRow: Ref<UnwrapRef<InputBox[][]>> = ref([]) // InputBox分行数组
const dropdownTableHeight = ref(0) // 弃用 所有行占用的高度
const formData = ref({})

// 方法
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
  if (props.inputBoxes && props.inputBoxes.length > 0) {
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

      // 能容纳则放进tempRow，否则tempRow指向新空数组，再放进tempRow
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
  }

  // 计算完的高度赋值
  dropdownTableHeight.value = height
}
</script>

<template>
  <BaseFormDialog :initial-form-data="formData" :mode="props.mode">
    <template #default>
      <template v-for="(boxRow, boxRowindex) in inputBoxInRow" :key="boxRowindex">
        <el-row class="dialog-form-row">
          <template v-for="(item, index) in boxRow" :key="index">
            <el-col class="dialog-form-label" :span="item.labelSpan">
              <div
                :key="boxRowindex + '-' + index"
                class="dialog-form-label-scroll-text-wrapper el-tag-mimic"
                style="width: 100%"
              >
                <ScrollTextBox>{{ item.label }}</ScrollTextBox>
              </div>
            </el-col>
            <el-col class="dialog-form-input" :span="item.inputSpan">
              <el-form-item>
                <el-input v-model="formData[item.name]"></el-input>
              </el-form-item>
            </el-col>
          </template>
        </el-row>
      </template>
    </template>
  </BaseFormDialog>
</template>

<style scoped>
.dialog-form-row {
  height: 32px;
  margin-top: 3px;
}
.dialog-form-label {
  height: 100%;
  display: flex;
  justify-content: flex-end;
}
.dialog-form-input {
  display: flex;
  justify-content: flex-start;
}
</style>
