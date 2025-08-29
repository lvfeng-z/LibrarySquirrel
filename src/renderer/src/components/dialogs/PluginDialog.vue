<script setup lang="ts">
import DialogMode from '../../model/util/DialogMode'
import ApiUtil from '../../utils/ApiUtil'
import FormDialog from '@renderer/components/dialogs/FormDialog.vue'
import Plugin from '@renderer/model/main/entity/Plugin.ts'
import { ElMessage } from 'element-plus'

// props
const props = withDefaults(
  defineProps<{
    mode?: DialogMode
    submitEnabled?: boolean
  }>(),
  {
    mode: DialogMode.VIEW,
    submitEnabled: true
  }
)

// model
// 表单数据
const formData = defineModel<Plugin>('formData', { required: true })
// 弹窗开关
const state = defineModel<boolean>('state', { required: true })

// 变量
// 接口
const apis = {
  pluginReinstall: window.api.pluginReinstall,
  pluginUnInstall: window.api.pluginUnInstall
}

// 方法
// 重新安装
async function reInstall(pluginId: number | undefined | null) {
  const response = await apis.pluginReinstall(pluginId)
  if (ApiUtil.check(response)) {
    ElMessage({
      type: 'success',
      message: '修复完成'
    })
  } else {
    ElMessage({
      type: 'error',
      message: `修复失败，${response.message}`
    })
  }
}
// 卸载
async function unInstall(pluginId: number | undefined | null) {
  const response = await apis.pluginUnInstall(pluginId)
  if (ApiUtil.check(response)) {
    ElMessage({
      type: 'success',
      message: '已卸载'
    })
  } else {
    ElMessage({
      type: 'success',
      message: `卸载失败，${response.message}`
    })
  }
}
</script>

<template>
  <form-dialog v-model:form-data="formData" v-model:state="state" :mode="props.mode">
    <template #header>
      <span style="font-size: 20px">站点</span>
    </template>
    <template #form>
      <el-row>
        <el-col>
          <el-form-item label="名称">
            <el-input v-model="formData.name"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col>
          <el-form-item label="描述">
            <el-input v-model="formData.description" type="textarea" autosize></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col>
          <el-form-item label="更新日志">
            <el-input v-model="formData.changelog" type="textarea" autosize></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <el-form-item label="创建时间">
            <el-date-picker v-model="formData.createTime" type="datetime" value-format="x" disabled></el-date-picker>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="修改时间">
            <el-date-picker v-model="formData.updateTime" type="datetime" value-format="x" disabled></el-date-picker>
          </el-form-item>
        </el-col>
      </el-row>
    </template>
    <template #footer>
      <el-row>
        <el-col :span="3">
          <el-button type="primary" @click="reInstall(formData.id)">修复</el-button>
        </el-col>
        <el-col :span="3">
          <el-button type="danger" @click="unInstall(formData.id)">卸载</el-button>
        </el-col>
        <el-col :span="3">
          <el-button @click="state = false">取消</el-button>
        </el-col>
      </el-row>
    </template>
  </form-dialog>
</template>

<style scoped></style>
