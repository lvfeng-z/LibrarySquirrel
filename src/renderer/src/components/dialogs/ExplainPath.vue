<script setup lang="ts">
// TODO 新增一个输入用于解析路径的正则表达式和一个解析此路径下文件名的正则表达式
import { Ref, ref, UnwrapRef } from 'vue'
import { MeaningOfPath } from '../../model/util/MeaningOfPath.ts'
import lodash from 'lodash'
import AutoLoadSelect from '../common/AutoLoadSelect.vue'
import ApiResponse from '../../model/util/ApiResponse'
import ApiUtil from '../../utils/ApiUtil'
import AutoExplainPath from '../../model/main/entity/AutoExplainPath.ts'
import { PathTypeEnum } from '../../constants/PathTypeEnum'
import StringUtil from '../../utils/StringUtil'
import PageModel from '../../model/util/PageModel'
import AutoExplainPathQueryDTO from '../../model/main/queryDTO/AutoExplainPathQueryDTO'
import { isNullish } from '../../utils/CommonUtil'

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
  autoExplainPathGetListenerPage: window.api.autoExplainPathGetListenerPage,
  autoExplainPathGetListenerList: window.api.autoExplainPathGetListenerList,
  localAuthorQuerySelectItemPage: window.api.localAuthorQuerySelectItemPage,
  localTagQuerySelectItemPage: window.api.localTagQuerySelectItemPage,
  siteQuerySelectItemPage: window.api.siteQuerySelectItemPage
}
// 目录含义选择列表
const meaningTypes = [
  { value: PathTypeEnum.AUTHOR, label: '作者' },
  { value: PathTypeEnum.TAG, label: '标签' },
  { value: PathTypeEnum.WORKS_NAME, label: '作品名称' },
  { value: PathTypeEnum.WORKS_SET_NAME, label: '作品集名称' },
  { value: PathTypeEnum.SITE, label: '站点名称' },
  { value: PathTypeEnum.CREATE_TIME, label: '创建时间' },
  { value: PathTypeEnum.UNKNOWN, label: '未知/无含义' }
]
const meaningOfPaths: Ref<UnwrapRef<MeaningOfPath[]>> = ref([new MeaningOfPath()]) // 目录含义列表
const autoExplains: Ref<UnwrapRef<AutoExplainPath[]>> = ref([]) // 自动解释列表
const autoExplainPage: Ref<UnwrapRef<PageModel<AutoExplainPathQueryDTO, AutoExplainPath>>> = ref(
  new PageModel<AutoExplainPathQueryDTO, AutoExplainPath>()
)
const autoExplainSelected: Ref<UnwrapRef<object>> = ref({})

// 方法
// 确认解释
function confirmExplain() {
  const temp = lodash.cloneDeep(meaningOfPaths.value)
  window.electron.ipcRenderer.send('explain-path-response', temp)
  state.value = false
}
// 确认解释
async function loadAutoExplain() {
  const stringToExplain = StringUtil.isBlank(props.stringToExplain) ? 'Artist[test]' : props.stringToExplain
  autoExplainPage.value.query = new AutoExplainPathQueryDTO()
  autoExplainPage.value.query.path = stringToExplain
  const tempPage = lodash.cloneDeep(autoExplainPage.value)
  const response = await apis.autoExplainPathGetListenerPage(tempPage)
  if (ApiUtil.check(response)) {
    const newPage = ApiUtil.data(response) as PageModel<AutoExplainPathQueryDTO, AutoExplainPath>
    autoExplains.value = isNullish(newPage.data) ? [] : newPage.data
  }
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
function getInputRowType(pathType: PathTypeEnum) {
  let inputType: string
  switch (pathType) {
    case PathTypeEnum.AUTHOR:
    case PathTypeEnum.TAG:
    case PathTypeEnum.SITE:
      inputType = 'select'
      break
    case PathTypeEnum.WORKS_NAME:
    case PathTypeEnum.WORKS_SET_NAME:
      inputType = 'input'
      break
    case PathTypeEnum.CREATE_TIME:
      inputType = 'dateTimePicker'
      break
    default:
      inputType = 'input'
      break
  }
  return inputType
}
// 获取输入栏数据接口
function getInputRowDataApi(pathType: PathTypeEnum): () => ApiResponse {
  switch (pathType) {
    case PathTypeEnum.AUTHOR:
      return apis.localAuthorQuerySelectItemPage
    case PathTypeEnum.TAG:
      return apis.localTagQuerySelectItemPage
    case PathTypeEnum.SITE:
      return apis.siteQuerySelectItemPage
    default:
      throw new Error('不支持的类型使用了getInputRowDataApi函数')
  }
}
// 重置输入栏
function resetInputData(meaningOfPath: MeaningOfPath) {
  meaningOfPath.id = undefined
  meaningOfPath.name = undefined
}
//
function getOptions(str: string, reg: string) {
  if (StringUtil.isBlank(str)) {
    str = 'Artist[test]'
  }
  const temp = str.match(new RegExp(reg as string))
  return temp
}
</script>

<template>
  <el-dialog v-model="state" destroy-on-close class="explain-path-dialog">
    <div class="explain-path-dialog-manual-automatic">
      <div class="explain-path-dialog-manual">
        <el-row>
          <el-text>{{ props.stringToExplain }}</el-text>
        </el-row>
        <el-row>
          <el-button type="primary" @click="confirmExplain">确定</el-button>
          <el-button type="success" icon="circlePlus" @click="addInputRow"></el-button>
        </el-row>
        <el-scrollbar class="explain-path-dialog-context-scrollbar">
          <template v-for="(meaningOfPath, index) in meaningOfPaths" :key="index">
            <el-row>
              <el-col :span="5">
                <el-select v-model="meaningOfPath.type" @change="resetInputData(meaningOfPath)">
                  <el-option v-for="item in meaningTypes" :key="item.value" :value="item.value" :label="item.label"> </el-option>
                </el-select>
              </el-col>
              <el-col :span="17">
                <el-input v-if="getInputRowType(meaningOfPath.type) === 'input'" v-model="meaningOfPath.name"></el-input>
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
      <div class="explain-path-dialog-automatic">
        <el-row>
          <el-text>{{ props.stringToExplain }}</el-text>
        </el-row>
        <el-row>
          <el-button type="primary" @click="loadAutoExplain">加载</el-button>
          <el-switch></el-switch>
        </el-row>
        <el-scrollbar class="explain-path-dialog-context-scrollbar">
          <template v-for="(autoExplain, index1) in autoExplains" :key="autoExplain.id">
            <el-row>
              <el-col :span="5">
                <el-select v-model="autoExplain.type" disabled>
                  <el-option v-for="item in meaningTypes" :key="item.value" :value="item.value" :label="item.label"> </el-option>
                </el-select>
              </el-col>
              <el-col :span="5">
                <el-input v-model="autoExplain.name"></el-input>
              </el-col>
              <el-col :span="9">
                <el-input v-model="autoExplain.regularExpression"></el-input>
              </el-col>
              <el-col :span="5">
                <el-select v-model="autoExplainSelected[index1]">
                  <el-option
                    v-for="(item, index) in getOptions(props.stringToExplain, autoExplain.regularExpression as string)"
                    :key="index"
                    :value="index"
                    :label="item"
                  >
                  </el-option>
                </el-select>
              </el-col>
            </el-row>
          </template>
        </el-scrollbar>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.explain-path-dialog-manual-automatic {
  display: flex;
  max-height: 50vh;
  width: 100%;
  flex-direction: row;
}
.explain-path-dialog-manual {
  display: flex;
  max-height: 50vh;
  width: 50%;
  flex-direction: column;
}
.explain-path-dialog-automatic {
  display: flex;
  max-height: 50vh;
  width: 50%;
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
