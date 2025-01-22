<script setup lang="ts">
import { TaskStatesEnum } from '@renderer/constants/TaskStatesEnum.ts'
import TaskDTO from '@renderer/model/main/dto/TaskDTO.ts'
import { IsNullish, NotNullish } from '@renderer/utils/CommonUtil.ts'
import { TaskOperationCodeEnum } from '@renderer/constants/TaskOperationCodeEnum.ts'
import TaskProcessingDTO from '@renderer/model/main/dto/TaskProcessingDTO.ts'

// props
const props = defineProps<{
  row: TaskProcessingDTO
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
  if (NotNullish(row.status)) {
    return taskStatusMapping[row.status]
  } else {
    return taskStatusMapping['0']
  }
}
</script>

<template>
  <div>
    <el-button-group
      v-show="
        (row.status !== TaskStatesEnum.PROCESSING && row.status !== TaskStatesEnum.WAITING && row.status !== TaskStatesEnum.PAUSE) ||
        row.hasChildren
      "
      style="margin-left: auto; margin-right: auto; flex-shrink: 0"
    >
      <el-tooltip v-if="props.row.isCollection" :enterable="false" :show-after="650" :hide-after="0" content="详情">
        <el-button size="small" icon="View" @click="buttonClicked(row, TaskOperationCodeEnum.VIEW)" />
      </el-tooltip>
      <el-tooltip :content="mapToButtonStatus(row).tooltip" :enterable="false" :show-after="650" :hide-after="0">
        <el-button
          size="small"
          :icon="mapToButtonStatus(row).icon"
          :loading="mapToButtonStatus(row).processing && !row.continuable && !row.isCollection"
          @click="buttonClicked(row, mapToButtonStatus(row).operation)"
        ></el-button>
      </el-tooltip>
      <el-tooltip content="取消" :enterable="false" :show-after="650" :hide-after="0">
        <el-button size="small" icon="CircleClose" @click="buttonClicked(row, TaskOperationCodeEnum.CANCEL)" />
      </el-tooltip>
      <el-tooltip content="删除" :enterable="false" :show-after="650" :hide-after="0">
        <el-button size="small" icon="Delete" @click="buttonClicked(row, TaskOperationCodeEnum.DELETE)" />
      </el-tooltip>
    </el-button-group>
    <transition name="task-operation-bar-el-progress-fade">
      <div
        v-if="
          (row.status === TaskStatesEnum.PROCESSING || row.status === TaskStatesEnum.WAITING || row.status === TaskStatesEnum.PAUSE) &&
          row.hasChildren
        "
      >
        <el-progress
          style="width: 100%"
          :percentage="IsNullish(row.schedule) ? 0 : Math.round(row.schedule * 100) / 100"
          text-inside
          :stroke-width="15"
          striped
          striped-flow
          :duration="5"
        >
          <template #default="{ percentage }">
            <span style="font-size: 14px">
              {{ percentage + '% ' + row.finished + ' / ' + row.total }}
            </span>
          </template>
        </el-progress>
      </div>
    </transition>
    <el-progress
      v-show="
        (row.status === TaskStatesEnum.PROCESSING || row.status === TaskStatesEnum.WAITING || row.status === TaskStatesEnum.PAUSE) &&
        !row.hasChildren
      "
      style="width: 100%"
      :percentage="IsNullish(row.schedule) ? 0 : Math.round(row.schedule * 100) / 100"
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

<style scoped>
.task-operation-bar-el-progress-fade-enter-active,
.task-operation-bar-el-progress-fade-leave-active {
  transition: opacity 1.5s;
}
.task-operation-bar-el-progress-fade-enter,
.task-operation-bar-el-progress-fade-leave-to {
  opacity: 0;
}
</style>
