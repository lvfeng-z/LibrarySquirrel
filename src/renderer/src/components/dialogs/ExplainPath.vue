<script setup lang="ts">
import { Ref, ref, UnwrapRef } from 'vue'
import SelectOption from '../../model/util/SelectOption.ts'
import ApiUtil from '../../utils/ApiUtil.ts'
import PageCondition from '../../model/util/PageCondition.ts'
import { MeaningOfPath, PathType } from '../../model/util/MeaningOfPath.ts'

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
const typeOfMeaning: Ref<UnwrapRef<PathType>> = ref('unknown') // 目录含义类型
const selected: Ref<UnwrapRef<SelectOption | undefined>> = ref() // 选中的数据
const meaningOfPaths: Ref<UnwrapRef<MeaningOfPath[]>> = ref([new MeaningOfPath()])
const authorSelectList: Ref<UnwrapRef<SelectOption[]>> = ref([]) // 作者选择列表
const tagSelectList: Ref<UnwrapRef<SelectOption[]>> = ref([]) // 标签选择列表
const siteSelectList: Ref<UnwrapRef<SelectOption[]>> = ref([]) // 站点选择列表

// 方法
function confirmExplain() {
  if (selected.value !== undefined) {
    const meaningOfPath = new MeaningOfPath()
    meaningOfPath.type = typeOfMeaning.value
    meaningOfPath.id = selected.value.value
    window.electron.ipcRenderer.send('explain-path-response', [meaningOfPath])
  }
}
// 增加一个输入栏
function addInput() {
  meaningOfPaths.value.push(new MeaningOfPath())
}
// 移除一个输入栏
function removeInput(index: number) {
  meaningOfPaths.value.splice(index, 1)
}
// 输入栏获取类型
function getInputType(pathType: PathType) {
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
// 输入栏获取数据接口
async function getInputDataApi(pathType: PathType) {
  switch (pathType) {
    case 'author':
      authorSelectList.value = await requestInputData(apis.localAuthorGetSelectItemPage)
      break
    case 'tag':
      tagSelectList.value = await requestInputData(apis.localAuthorGetSelectItemPage)
      break
    case 'siteName':
      siteSelectList.value = await requestInputData(apis.localAuthorGetSelectItemPage)
      break
    default:
      break
  }
}
//
function getInputData(pathType: PathType): Ref<UnwrapRef<SelectOption[]>> {
  switch (pathType) {
    case 'author':
      return authorSelectList
    case 'tag':
      return tagSelectList
    case 'siteName':
      return siteSelectList
    default:
      return authorSelectList
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
      <el-button type="success" icon="circlePlus" @click="addInput"></el-button>
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
                v-if="getInputType(meaningOfPath.type) === 'input'"
                v-model="meaningOfPath.name"
              ></el-input>
              <el-select
                v-if="getInputType(meaningOfPath.type) === 'select'"
                v-model="meaningOfPath.id"
                remote
                :remote-method="getInputDataApi(meaningOfPath.type)"
              >
                <el-option
                  v-for="item in authorSelectList"
                  :key="item.value"
                  :value="item.value"
                  :label="item.label"
                >
                </el-option>
              </el-select>
              <el-date-picker
                v-if="getInputType(meaningOfPath.type) === 'dateTimePicker'"
              ></el-date-picker>
            </el-col>
            <el-col :span="2">
              <el-button type="warning" icon="Remove" @click="removeInput(index)"></el-button>
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
