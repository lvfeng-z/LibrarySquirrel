<script setup lang="ts">
import BaseFormDialog from '../common/BaseFormDialog.vue'
import { Ref, ref, UnwrapRef } from 'vue'
import LocalTag from '../../model/main/LocalTag'

// 变量
const formData: Ref<UnwrapRef<LocalTag>> = ref({
  id: undefined,
  createTime: undefined,
  updateTime: undefined,
  localTagName: undefined,
  baseLocalTagId: undefined
})
</script>

<template>
  <BaseFormDialog :initial-form-data="formData">
    <template #default>
      <el-row>
        <el-col>
          <el-form-item label="名称">
            <el-input v-model="formData.localTagName"></el-input>
          </el-form-item>
        </el-col>
        <el-col>
          <el-form-item label="基础标签id">
            <el-input v-model="formData.baseLocalTagId"></el-input>
          </el-form-item>
        </el-col>
        <el-col>
          <el-form-item label="创建时间">
            <el-date-picker v-model="formData.createTime" disabled></el-date-picker>
          </el-form-item>
        </el-col>
        <el-col>
          <el-form-item label="修改时间">
            <el-date-picker v-model="formData.updateTime" disabled></el-date-picker>
          </el-form-item>
        </el-col>
      </el-row>
    </template>
  </BaseFormDialog>
</template>

<style scoped></style>
