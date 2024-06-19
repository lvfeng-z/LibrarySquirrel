<script setup lang="ts">
import { Ref, ref, UnwrapRef } from 'vue'
import { MeaningOfPath, PathType } from '../../model/util/MeaningOfPath.ts'
import lodash from 'lodash'
import AutoLoadSelect from '../common/AutoLoadSelect.vue'
import ApiResponse from '../../model/util/ApiResponse'

// props
const props = defineProps<{
  stringToExplain: string
}>()

// model
// dialog开关
const state = defineModel<boolean>('state', {
  default: false
})

// 变量
// 接口
const apis = {
  localAuthorGetSelectItemPage: window.api.localAuthorGetSelectItemPage,
  localTagGetSelectItemPage: window.api.localTagGetSelectItemPage,
  siteGetSelectItemPage: window.api.siteGetSelectItemPage
}
// 目录含义选择列表
const meaningTypes = [
  { value: 'author', label: '作者' },
  { value: 'tag', label: '标签' },
  { value: 'worksName', label: '作品名称' },
  { value: 'worksSetName', label: '作品集名称' },
  { value: 'site', label: '站点名称' },
  { value: 'createTime', label: '创建时间' },
  { value: 'unknown', label: '未知/无含义' }
]
const meaningOfPaths: Ref<UnwrapRef<MeaningOfPath[]>> = ref([new MeaningOfPath()]) // 目录含义列表

// 方法
function confirmExplain() {
  const temp = lodash.cloneDeep(meaningOfPaths.value)
  window.electron.ipcRenderer.send('explain-path-response', temp)
  state.value = false
}
// 增加一行输入栏
function addInputRow() {
  meaningOfPaths.value.push(new MeaningOfPath())
}
// 移除一行输入栏
function removeInputRow(index: number) {
  meaningOfPaths.value.splice(index, 1)
}
// 获取输入栏类型
function getInputRowType(pathType: PathType) {
  let inputType: string
  switch (pathType) {
    case 'author':
    case 'tag':
    case 'site':
      inputType = 'select'
      break
    case 'worksName':
    case 'worksSetName':
      inputType = 'input'
      break
    case 'createTime':
      inputType = 'dateTimePicker'
      break
    default:
      inputType = 'input'
      break
  }
  return inputType
}
// 获取输入栏数据接口
function getInputRowDataApi(pathType: PathType): () => ApiResponse {
  switch (pathType) {
    case 'author':
      return apis.localAuthorGetSelectItemPage
    case 'tag':
      return apis.localTagGetSelectItemPage
    case 'site':
      return apis.siteGetSelectItemPage
    default:
      throw new Error('不支持的类型使用了getInputRowDataApi函数')
  }
}
// 重置输入栏
function resetInputData(meaningOfPath: MeaningOfPath) {
  meaningOfPath.id = undefined
  meaningOfPath.name = undefined
}
</script>

<template>
  <el-dialog v-model="state" destroy-on-close class="explain-path-dialog">
    <el-row>
      <el-text>{{ props.stringToExplain }}</el-text>
    </el-row>
    <el-row>
      <el-button type="primary" @click="confirmExplain">确定</el-button>
      <el-button type="success" icon="circlePlus" @click="addInputRow"></el-button>
    </el-row>
    <div class="explain-path-dialog-context">
      <el-scrollbar class="explain-path-dialog-context-scrollbar">
        <template v-for="(meaningOfPath, index) in meaningOfPaths" :key="index">
          <el-row>
            <el-col :span="5">
              <el-select v-model="meaningOfPath.type" @change="resetInputData(meaningOfPath)">
                <el-option
                  v-for="item in meaningTypes"
                  :key="item.value"
                  :value="item.value"
                  :label="item.label"
                >
                </el-option>
              </el-select>
            </el-col>
            <el-col :span="17">
              <el-input
                v-if="getInputRowType(meaningOfPath.type) === 'input'"
                v-model="meaningOfPath.name"
              ></el-input>
              <auto-load-select
                v-if="getInputRowType(meaningOfPath.type) === 'select'"
                v-model="meaningOfPath.id"
                remote
                filterable
                :api="getInputRowDataApi(meaningOfPath.type)"
              >
              </auto-load-select>
              <el-date-picker
                v-if="getInputRowType(meaningOfPath.type) === 'dateTimePicker'"
                v-model="meaningOfPath.name"
              ></el-date-picker>
            </el-col>
            <el-col :span="2">
              <el-button type="warning" icon="Remove" @click="removeInputRow(index)"></el-button>
            </el-col>
          </el-row>
        </template>
      </el-scrollbar>
    </div>
  </el-dialog>
</template>

<style scoped>
.explain-path-dialog-context {
  display: flex;
  max-height: 50vh;
  flex-direction: column;
}
.explain-path-dialog-context-scrollbar {
  height: 100%;
  max-height: inherit;
}
:deep(.explain-path-dialog-context-scrollbar .el-scrollbar__wrap) {
  max-height: inherit;
}
</style>
