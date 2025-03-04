<script setup lang="ts">
import CollapsePanel from '@renderer/components/common/CollapsePanel.vue'
import { useTaskStore } from '@renderer/store/UseTaskStore.ts'
import { useParentTaskStore } from '@renderer/store/UseParentTaskStore.ts'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'

// model
// 开关状态
const state = defineModel<boolean>('state', { required: true })
const taskStatus = useTaskStore().$state
const parentTaskStatus = useParentTaskStore().$state
</script>

<template>
  <collapse-panel v-model:state="state" border-radios="10px" position="right">
    <div style="height: 100%; width: 300px; background-color: rgb(255, 255, 255, 0.9)">
      <div>
        父任务
        <template v-for="item in parentTaskStatus.values()" :key="item.id">
          <el-progress
            style="width: 100%"
            :percentage="IsNullish(item.schedule) ? 0 : Math.round(item.schedule * 100) / 100"
            text-inside
            :stroke-width="15"
            striped
            striped-flow
            :duration="5"
          >
            <template #default="{ percentage }">
              <span style="font-size: 14px">
                {{ percentage + '% ' + item.finished + ' / ' + item.total }}
              </span>
            </template>
          </el-progress>
        </template>
      </div>
      <div>
        子任务
        <template v-for="item in taskStatus.values()" :key="item.id">
          <el-progress
            style="width: 100%"
            :percentage="IsNullish(item.schedule) ? 0 : Math.round(item.schedule * 100) / 100"
            text-inside
            :stroke-width="24"
            striped
            striped-flow
            :duration="5"
          >
            <template #default="{ percentage }">
              <span style="font-size: 15px">{{ percentage }}%</span>
            </template>
          </el-progress>
        </template>
      </div>
    </div>
  </collapse-panel>
</template>

<style scoped></style>
