<script setup lang="ts">
import BaseFormDialog from '../common/BaseFormDialog.vue'
import DialogMode from '../../model/util/DialogMode'
import { h, Ref, ref, UnwrapRef, VNode } from 'vue'
import TaskDTO from '../../model/main/dto/TaskDTO'
import SearchTable from '../common/SearchTable.vue'
import Thead from '../../model/util/Thead'
import { TaskStatesEnum } from '../../constants/TaskStatesEnum'
import { ElTag } from 'element-plus'
import InputBox from '../../model/util/InputBox'

// props
const props = defineProps<{
  mode: DialogMode
}>()

// model
const formData: Ref<UnwrapRef<TaskDTO>> = defineModel('formData', { type: Object, required: true })

// 暴露
defineExpose({
  handleDialog
})

// 变量
// 接口
const apis = {
  taskSelectChildrenTaskPage: window.api.taskSelectChildrenTaskPage
}
// 弹窗开关
const state = ref(false)
// 表头
const thead: Ref<UnwrapRef<Thead[]>> = ref([
  {
    type: 'text',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'taskName',
    label: '名称',
    hide: false,
    width: 200,
    headerAlign: 'center',
    dataAlign: 'left',
    overHide: true
  },
  {
    type: 'text',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'url',
    label: 'url',
    hide: false,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  },
  {
    type: 'text',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'siteDomain',
    label: '站点',
    hide: false,
    width: 150,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  },
  {
    type: 'datetime',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'createTime',
    label: '创建时间',
    hide: false,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  },
  {
    type: 'custom',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'status',
    label: '状态',
    hide: false,
    width: 80,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true,
    render: (data: TaskStatesEnum): VNode => {
      let tagType: 'success' | 'warning' | 'info' | 'primary' | 'danger' | undefined
      let tagText: string | undefined
      switch (data) {
        case TaskStatesEnum.CREATED:
          tagType = 'primary'
          tagText = '已创建'
          break
        case TaskStatesEnum.PROCESSING:
          tagType = 'warning'
          tagText = '进行中'
          break
        case TaskStatesEnum.WAITING:
          tagType = 'warning'
          tagText = '等待中'
          break
        case TaskStatesEnum.PAUSE:
          tagType = 'info'
          tagText = '已暂停'
          break
        case TaskStatesEnum.FINISHED:
          tagType = 'success'
          tagText = '完成'
          break
        case TaskStatesEnum.PARTLY_FINISHED:
          tagType = 'success'
          tagText = '部分完成'
          break
        case TaskStatesEnum.FAILED:
          tagType = 'danger'
          tagText = '失败'
          break
      }
      const elTag = h(ElTag, { type: tagType }, () => tagText)
      return h(
        'div',
        { style: { display: 'flex', 'align-items': 'center', 'justify-content': 'center' } },
        elTag
      )
    }
  }
])
// 数据主键
const keyOfData: string = 'id'
// 主搜索栏的inputBox
const mainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref([
  {
    name: 'taskName',
    type: 'text',
    placeholder: '输入任务的名称',
    inputSpan: 13
  },
  {
    name: 'site_domain',
    type: 'select',
    inputSpan: 4,
    pagingApi: true
  },
  {
    name: 'status',
    type: 'select',
    inputSpan: 4,
    selectData: [
      {
        value: TaskStatesEnum.CREATED,
        label: '已创建'
      },
      {
        value: TaskStatesEnum.PAUSE,
        label: '暂停'
      },
      {
        value: TaskStatesEnum.FINISHED,
        label: '已完成'
      },
      {
        value: TaskStatesEnum.FAILED,
        label: '失败'
      },
      {
        value: TaskStatesEnum.PARTLY_FINISHED,
        label: '部分完成'
      }
    ]
  }
])
// 改变的行数据
const changedRows: Ref<UnwrapRef<object[]>> = ref([])

// 方法
function handleDialog(newState: boolean) {
  state.value = newState
}
</script>

<template>
  <base-form-dialog v-model:form-data="formData" v-model:state="state" :mode="props.mode">
    <template #default>
      <el-row>
        <el-col>
          <el-form-item label="名称">
            <el-input v-model="formData.taskName"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col>
          <el-form-item label="url">
            <el-input v-model="formData.url"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <el-form-item label="站点">
            <el-input v-model="formData.siteDomain"></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态">
            <el-input v-model="formData.status"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <el-form-item label="创建时间">
            <el-date-picker v-model="formData.createTime"></el-date-picker>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="修改时间">
            <el-date-picker v-model="formData.updateTime"></el-date-picker>
          </el-form-item>
        </el-col>
      </el-row>
      <search-table
        :selectable="true"
        :thead="thead"
        :search-api="apis.taskSelectChildrenTaskPage"
        :fixed-param="{ pid: formData.id }"
        :drop-down-input-boxes="[]"
        :key-of-data="keyOfData"
        :main-input-boxes="mainInputBoxes"
        :multi-select="true"
        :changed-rows="changedRows"
      >
      </search-table>
    </template>
  </base-form-dialog>
</template>

<style scoped></style>
