<script setup lang="ts">
import { Ref, ref, UnwrapRef } from 'vue'
import SelectOption from '../../model/util/SelectOption.ts'
import ApiUtil from '../../utils/ApiUtil.ts'
import PageCondition from '../../model/util/PageCondition.ts'
import { MeaningOfPath, PathType } from '../../model/util/MeaningOfPath.ts'
import lodash from 'lodash'

// props
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
const meaningOfPaths: Ref<UnwrapRef<MeaningOfPath[]>> = ref([new MeaningOfPath()]) // 目录含义列表
const authorSelectList: Ref<UnwrapRef<SelectOption[]>> = ref([]) // 作者选择列表
const tagSelectList: Ref<UnwrapRef<SelectOption[]>> = ref([]) // 标签选择列表
const siteSelectList: Ref<UnwrapRef<SelectOption[]>> = ref([]) // 站点选择列表

// 方法
function confirmExplain() {
  const temp = lodash.cloneDeep(meaningOfPaths.value)
  window.electron.ipcRenderer.send('explain-path-response', temp)
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
    case 'siteName':
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
function getInputRowDataApi(pathType: PathType) {
  switch (pathType) {
    case 'author':
      requestInputData(apis.localAuthorGetSelectItemPage).then((response) => {
        authorSelectList.value = response
      })
      break
    case 'tag':
      // tagSelectList.value = await requestInputData(apis.localAuthorGetSelectItemPage)
      break
    case 'siteName':
      // siteSelectList.value = await requestInputData(apis.localAuthorGetSelectItemPage)
      break
    default:
      break
  }
}
// 获取输入行的数据
function getInputRowData(pathType: PathType): SelectOption[] {
  switch (pathType) {
    case 'author':
      return authorSelectList.value
    case 'tag':
      return tagSelectList.value
    case 'siteName':
      return siteSelectList.value
    default:
      return []
  }
}
// 请求接口
async function requestInputData(api): Promise<SelectOption[]> {
  const page = new PageCondition()
  const response = await api(page)
  if (ApiUtil.apiResponseCheck(response)) {
    return (ApiUtil.apiResponseGetData(response) as PageCondition<object>).data as []
  } else {
    return []
  }
}
</script>

<template>
  <el-dialog class="explain-path-dialog">
    <el-row>
      <label>{{ props.stringToExplain }}</label>
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
              <el-select v-model="meaningOfPath.type">
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
              <el-select
                v-if="getInputRowType(meaningOfPath.type) === 'select'"
                v-model="meaningOfPath.id"
                remote
                :remote-method="getInputRowDataApi(meaningOfPath.type)"
              >
                <el-option
                  v-for="item in getInputRowData(meaningOfPath.type)"
                  :key="item.value"
                  :value="item.value"
                  :label="item.label"
                >
                </el-option>
              </el-select>
              <el-date-picker
                v-if="getInputRowType(meaningOfPath.type) === 'dateTimePicker'"
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
