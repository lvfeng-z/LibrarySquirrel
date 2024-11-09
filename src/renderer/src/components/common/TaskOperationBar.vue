<script setup lang="ts">
import { TaskStatesEnum } from '@renderer/constants/TaskStatesEnum.ts'
import TaskDTO from '@renderer/model/main/dto/TaskDTO.ts'
import { isNullish, notNullish } from '@renderer/utils/CommonUtil.ts'
import { TaskOperationCodeEnum } from '@renderer/constants/TaskOperationCodeEnum.ts'

// props
const props = defineProps<{
  row: TaskDTO
  buttonClicked: (row: TaskDTO, code: TaskOperationCodeEnum) => void
}>()

// 变量
// 任务状态与操作按钮状态的对应关系
const taskStatusMapping: {
  [K in TaskStatesEnum]: {
    tooltip: string
    icon: string
    operation: TaskOperationCodeEnum
    processing: boolean
  }
} = {
  [TaskStatesEnum.CREATED]: {
    tooltip: '开始',
    icon: 'VideoPlay',
    operation: TaskOperationCodeEnum.START,
    processing: false
  },
  [TaskStatesEnum.PROCESSING]: {
    tooltip: '暂停',
    icon: 'VideoPause',
    operation: TaskOperationCodeEnum.PAUSE,
    processing: true
  },
  [TaskStatesEnum.WAITING]: {
    tooltip: '等待中',
    icon: 'Loading',
    operation: TaskOperationCodeEnum.START,
    processing: true
  },
  [TaskStatesEnum.PAUSE]: {
    tooltip: '继续',
    icon: 'RefreshRight',
    operation: TaskOperationCodeEnum.RESUME,
    processing: false
  },
  [TaskStatesEnum.FINISHED]: {
    tooltip: '再次下载',
    icon: 'RefreshRight',
    operation: TaskOperationCodeEnum.RETRY,
    processing: false
  },
  [TaskStatesEnum.PARTLY_FINISHED]: {
    tooltip: '开始',
    icon: 'VideoPlay',
    operation: TaskOperationCodeEnum.START,
    processing: false
  },
  [TaskStatesEnum.FAILED]: {
    tooltip: '重试',
    icon: 'RefreshRight',
    operation: TaskOperationCodeEnum.RETRY,
    processing: false
  }
}

// 方法
// 任务状态映射为按钮状态
function mapToButtonStatus(row: TaskDTO): {
  tooltip: string
  icon: string
  operation: TaskOperationCodeEnum
  processing: boolean
} {
  if (notNullish(row.status)) {
    return taskStatusMapping[row.status]
  } else {
    return taskStatusMapping['0']
  }
}
</script>

<template>
  <div style="display: flex; flex-direction: row; justify-content: center; align-items: center">
    <el-button-group
      v-show="
        (row.status !== TaskStatesEnum.PROCESSING &&
          row.status !== TaskStatesEnum.WAITING &&
          row.status !== TaskStatesEnum.PAUSE) ||
        row.hasChildren
      "
      style="margin-right: 10px"
    >
      <el-tooltip v-if="props.row.isCollection" content="详情">
        <el-button
          size="small"
          icon="View"
          @click="buttonClicked(row, TaskOperationCodeEnum.VIEW)"
        />
      </el-tooltip>
      <el-tooltip :content="mapToButtonStatus(row).tooltip">
        <el-button
          size="small"
          :icon="mapToButtonStatus(row).icon"
          :loading="mapToButtonStatus(row).processing && !row.continuable && !row.isCollection"
          @click="buttonClicked(row, mapToButtonStatus(row).operation)"
        ></el-button>
      </el-tooltip>
      <el-tooltip content="取消">
        <el-button
          size="small"
          icon="CircleClose"
          @click="buttonClicked(row, TaskOperationCodeEnum.CANCEL)"
        />
      </el-tooltip>
      <el-tooltip content="删除">
        <el-button
          size="small"
          icon="Delete"
          @click="buttonClicked(row, TaskOperationCodeEnum.DELETE)"
        />
      </el-tooltip>
    </el-button-group>
    <div
      v-show="
        (row.status === TaskStatesEnum.PROCESSING ||
          row.status === TaskStatesEnum.WAITING ||
          row.status === TaskStatesEnum.PAUSE) &&
        row.hasChildren
      "
      style="display: flex; flex-direction: row; justify-content: center; align-content: center"
    >
      <el-progress
        type="circle"
        style="width: 100%"
        :percentage="isNullish(row.schedule) ? 0 : Math.round(row.schedule * 100) / 100"
        :stroke-width="2"
        :width="47"
        @click="buttonClicked(row, mapToButtonStatus(row).operation)"
      >
        <template #default="{ percentage }">
          <div style="display: flex; flex-direction: column">
            <span style="font-size: 10px">{{ percentage }}%</span>
            <span style="font-size: 10px">{{ percentage }}%</span>
          </div>
        </template>
      </el-progress>
    </div>
    <el-progress
      v-show="
        (row.status === TaskStatesEnum.PROCESSING ||
          row.status === TaskStatesEnum.WAITING ||
          row.status === TaskStatesEnum.PAUSE) &&
        !row.hasChildren
      "
      style="width: 100%"
      :percentage="isNullish(row.schedule) ? 0 : Math.round(row.schedule * 100) / 100"
      text-inside
      :stroke-width="24"
      striped
      striped-flow
      :duration="5"
      @click="buttonClicked(row, mapToButtonStatus(row).operation)"
    >
      <template #default="{ percentage }">
        <span style="font-size: 15px">{{ percentage }}%</span>
      </template>
    </el-progress>
  </div>
</template>

<style scoped></style>
