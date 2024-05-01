<script setup lang="ts">
import { onBeforeMount, Ref, ref, UnwrapRef } from 'vue'
import { InputBox } from '../../utils/model/InputBox'
import DropdownTable from './DropdownTable.vue'
import ScrollTextBox from './ScrollTextBox.vue'

// props
const props = withDefaults(
  defineProps<{
    mainInputBoxes: InputBox[]
    dropDownInputBoxes: InputBox[]
    createButton?: boolean
    reverse?: boolean
    searchButtonDisabled?: boolean
  }>(),
  {
    createButton: false,
    reverse: false,
    searchButtonDisabled: false
  }
)

// onBeforeMount
onBeforeMount(() => {
  calculateSpan()
})

// 事件
const emits = defineEmits(['paramsChanged', 'searchButtonClicked', 'createButtonClicked'])

// 变量
const dropDownTable = ref() // DropDownTable子组件的ref
const barButtonSpan = ref(3) // 查询和新增按钮的span
const innerMainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref([]) // 主搜索栏中元素的列表
const innerDropDownInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref([]) // 下拉搜索框中元素的列表
const showDropdownFlag: Ref<UnwrapRef<boolean>> = ref(false) // 展示下拉框开关
const formData = ref({}) // 查询参数

// 方法
// 处理主搜索栏和下拉搜索框
function calculateSpan() {
  let spanRest = 24 - (props.createButton ? barButtonSpan.value * 2 : barButtonSpan.value)
  for (const inputBox of props.mainInputBoxes) {
    // 储存当前box的长度
    let boxSpan = 0
    // 不更改props属性
    const tempInputBox: InputBox = JSON.parse(JSON.stringify(inputBox))

    // 未设置是否展示标题，默认为false，labelSpan设为0
    if (tempInputBox.showLabel == undefined) {
      tempInputBox.showLabel = false
      tempInputBox.labelSpan = 0
    }

    if (spanRest > 0) {
      // 未设置tag长度则设置为2
      if (tempInputBox.labelSpan == undefined) {
        tempInputBox.labelSpan = 2
      }
      // 未设置input长度则设置为5
      if (tempInputBox.inputSpan == undefined) {
        tempInputBox.inputSpan = 5
      }

      // 判断是否能够容纳此box，空间不足就放进dropDownInputBoxes
      boxSpan += tempInputBox.labelSpan + tempInputBox.inputSpan
      spanRest -= boxSpan
      if (spanRest < 0) {
        innerDropDownInputBoxes.value.push(tempInputBox)
      } else {
        innerMainInputBoxes.value.push(tempInputBox)
      }
    } else {
      innerDropDownInputBoxes.value.push(tempInputBox)
    }
  }

  // 长度不相等，说明有元素被放进dropDownInputBoxes
  if (innerMainInputBoxes.value.length != props.mainInputBoxes.length) {
    console.debug(
      '主搜索栏长度不足以容纳所有mainInputBoxes元素，不能容纳的元素以被移动至dropDownInputBoxes'
    )
  }

  const tempDropDownInputBoxes = JSON.parse(JSON.stringify(props.dropDownInputBoxes))
  innerDropDownInputBoxes.value.push(...tempDropDownInputBoxes)

  // 下拉菜单中有内容则显示下拉菜单，否则不显示
  showDropdownFlag.value = innerDropDownInputBoxes.value.length > 0
}

// 展示下拉搜索框
function handleDropdownTable() {
  dropDownTable.value.changeState()
}

// 用户输入改变时，发送paramsChanged事件
function handleParamsChanged() {
  emits('paramsChanged', formData.value)
}

// 处理dropDownMenu参数改变
function handleDropDownMenuParamsChanged(dropDownMenuParams: object) {
  Object.assign(formData.value, dropDownMenuParams)
  handleParamsChanged()
}

// 处理搜索按钮点击事件
function handleSearchButtonClicked() {
  emits('searchButtonClicked')
}

// 处理新增按钮点击事件
function handleCreateButtonClicked() {
  emits('createButtonClicked')
}
// 处理input清除事件
function handleInputClear(paramName: string) {
  delete formData.value[paramName]
  handleParamsChanged()
}
</script>

<template>
  <div
    :class="{
      'search-toolbar': true,
      'search-toolbar-normal': !reverse,
      'search-toolbar-reverse': reverse
    }"
  >
    <div class="search-toolbar-main">
      <el-form :model="formData" @input="handleParamsChanged">
        <el-row class="search-toolbar-main-row">
          <el-col v-if="createButton" class="search-toolbar-create-button" :span="barButtonSpan">
            <el-button type="primary" @click="handleCreateButtonClicked">新增</el-button>
          </el-col>
          <template v-for="(item, index) in innerMainInputBoxes" :key="index">
            <el-col v-if="item.showLabel" class="search-toolbar-label" :span="item.labelSpan">
              <div
                :key="index"
                class="search-toolbar-label-scroll-text-wrapper el-tag-mimic"
                style="width: 100%"
              >
                <ScrollTextBox>{{ item.label }}</ScrollTextBox>
              </div>
            </el-col>
            <el-col class="search-toolbar-input" :span="item.inputSpan">
              <el-form-item class="search-toolbar-input-form-item">
                <el-input
                  v-model="formData[item.name]"
                  :clearable="true"
                  :placeholder="item.placeholder"
                  @clear="handleInputClear(item.name)"
                ></el-input>
              </el-form-item>
            </el-col>
          </template>
          <el-col class="search-toolbar-search-button" :span="barButtonSpan">
            <el-dropdown>
              <el-button :disabled="props.searchButtonDisabled" @click="handleSearchButtonClicked">
                搜索
              </el-button>
              <template v-if="innerDropDownInputBoxes.length > 0" #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleDropdownTable">更多选项</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-col>
        </el-row>
      </el-form>
    </div>
    <div v-if="showDropdownFlag" class="dropdown-menu-wrapper">
      <div class="dropdown-menu rounded-borders">
        <DropdownTable
          ref="dropDownTable"
          :reverse="reverse"
          :input-boxes="innerDropDownInputBoxes"
          @params-changed="handleDropDownMenuParamsChanged"
        >
        </DropdownTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-toolbar {
  width: 100%;
  height: calc(32px);
  display: flex;
  flex-direction: column;
  align-content: center;
}
.search-toolbar-normal {
  flex-direction: column;
}
.search-toolbar-reverse {
  flex-direction: column-reverse;
}
.search-toolbar-main-row {
  height: 32px;
  width: 100%;
}
.search-toolbar-search-button {
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
}
.search-toolbar-label {
  height: 100%;
  display: flex;
  justify-content: flex-end;
}
.search-toolbar-input {
  display: flex;
  justify-content: flex-start;
}
.search-toolbar-input-form-item {
  width: 100%;
}
.dropdown-menu-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
}
.dropdown-menu {
  width: 100%;
  height: auto;
  margin-top: 1px;
  background-color: white;
  background-clip: padding-box;
  box-shadow: inset 0 0 0 1.5px rgba(0, 0, 0, 0); /* 利用内阴影模拟边框外背景透明效果 */
}
</style>
