<script setup lang="ts">
// props
import { Ref, ref, UnwrapRef } from 'vue'
import SelectOption from '../../model/util/SelectOption.ts'
import ApiUtil from '../../utils/ApiUtil.ts'
import ApiResponse from '../../model/util/ApiResponse.ts'
import PageCondition from '../../model/util/PageCondition.ts'
import { MeaningOfPath, PathType } from '../../model/util/MeaningOfPath.ts'

const props = defineProps<{
  stringToExplain: string
}>()

// 变量
// 接口
const apis = {
  localAuthorGetSelectItemPage: window.api.localAuthorGetSelectItemPage
}
// 目录含义选择列表
const meaningTypes = [
  { value: 'author', label: '作者' },
  { value: 'tag', label: '标签' },
  { value: 'worksName', label: '作品名称' },
  { value: 'worksSetName', label: '作品集名称' },
  { value: 'siteName', label: '站点名称' },
  { value: 'createTime', label: '创建时间' },
  { value: 'unknown', label: '未知/无含义' }
]
const typeOfMeaning: Ref<UnwrapRef<PathType>> = ref('unknown') // 目录含义类型
const typeOfInput = ref('select') // 输入栏类型
const selectList: Ref<UnwrapRef<SelectOption[]>> = ref([]) // 选择框数据
const selected: Ref<UnwrapRef<SelectOption | undefined>> = ref() // 选中的数据

// 方法
function confirmExplain() {
  if (selected.value !== undefined) {
    const meaningOfPath = new MeaningOfPath()
    meaningOfPath.type = typeOfMeaning.value
    meaningOfPath.id = selected.value.value
    window.electron.ipcRenderer.send('explain-path-response', [meaningOfPath])
  }
}
// 刷新输入栏
function refreshInput() {
  switch (typeOfMeaning.value) {
    case 'author':
      typeOfInput.value = 'select'
      requestInputData(apis.localAuthorGetSelectItemPage)
      break
    case 'tag':
      typeOfInput.value = 'select'
      break
    case 'siteName':
      typeOfInput.value = 'select'
      break
    case 'worksName':
    case 'worksSetName':
      typeOfInput.value = 'input'
      break
    case 'createTime':
      typeOfInput.value = 'dateTimePicker'
      break
    default:
      typeOfInput.value = 'input'
      break
  }
}
// 请求接口
function requestInputData(api) {
  const page = new PageCondition()
  api(page).then((response: ApiResponse) => {
    if (ApiUtil.apiResponseCheck(response)) {
      selectList.value = (ApiUtil.apiResponseGetData(response) as PageCondition<object>).data as []
    }
  })
}
</script>

<template>
  <el-dialog>
    <el-row>
      <label>{{ props.stringToExplain }}</label>
    </el-row>
    <el-row>
      <el-col :span="5">
        <el-select v-model="typeOfMeaning" @change="refreshInput">
          <el-option
            v-for="item in meaningTypes"
            :key="item.value"
            :value="item.value"
            :label="item.label"
          >
          </el-option>
        </el-select>
      </el-col>
      <el-col :span="19">
        <el-input v-if="typeOfInput === 'input'"></el-input>
        <el-select v-if="typeOfInput === 'select'" v-model="selected">
          <el-option v-for="item in selectList" :key="item.value" :value="item" :label="item.label">
          </el-option>
        </el-select>
        <el-date-picker v-if="typeOfInput === 'dateTimePicker'"></el-date-picker>
      </el-col>
    </el-row>
    <el-row>
      <el-button @click="confirmExplain">确定</el-button>
    </el-row>
  </el-dialog>
</template>

<style scoped></style>
