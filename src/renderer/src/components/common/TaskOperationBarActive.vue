<script setup lang="ts">
import { TaskStatusEnum } from '@renderer/constants/TaskStatusEnum.ts'
import TaskTreeDTO from '@renderer/model/main/dto/TaskTreeDTO.ts'
import { IsNullish, NotNullish } from '@renderer/utils/CommonUtil.ts'
import { TaskOperationCodeEnum } from '@renderer/constants/TaskOperationCodeEnum.ts'
import TaskProgressTreeDTO from '@renderer/model/main/dto/TaskProgressTreeDTO.ts'
import { useTaskStore } from '@renderer/store/UseTaskStore.ts'
import { useParentTaskStore } from '@renderer/store/UseParentTaskStore.ts'
import { computed, Ref } from 'vue'

// props
const props = defineProps<{
  row: TaskProgressTreeDTO
  buttonClicked: (row: TaskTreeDTO, code: TaskOperationCodeEnum) => void
}>()

// 变量
// 任务状态与操作按钮状态的对应关系
const taskStatusMapping: {
  [K in TaskStatusEnum]: {
    tooltip: string
    icon: string
    operation: TaskOperationCodeEnum
    processing: boolean
  }
} = {
  [TaskStatusEnum.CREATED]: {
    tooltip: '开始',
    icon: 'VideoPlay',
    operation: TaskOperationCodeEnum.START,
    processing: false
  },
  [TaskStatusEnum.PROCESSING]: {
    tooltip: '暂停',
    icon: 'VideoPause',
    operation: TaskOperationCodeEnum.PAUSE,
    processing: true
  },
  [TaskStatusEnum.WAITING]: {
    tooltip: '等待中',
    icon: 'Loading',
    operation: TaskOperationCodeEnum.PAUSE,
    processing: true
  },
  [TaskStatusEnum.PAUSE]: {
    tooltip: '继续',
    icon: 'RefreshRight',
    operation: TaskOperationCodeEnum.RESUME,
    processing: false
  },
  [TaskStatusEnum.FINISHED]: {
    tooltip: '再次下载',
    icon: 'RefreshRight',
    operation: TaskOperationCodeEnum.RETRY,
    processing: false
  },
  [TaskStatusEnum.PARTLY_FINISHED]: {
    tooltip: '开始',
    icon: 'VideoPlay',
    operation: TaskOperationCodeEnum.START,
    processing: false
  },
  [TaskStatusEnum.FAILED]: {
    tooltip: '重试',
    icon: 'RefreshRight',
    operation: TaskOperationCodeEnum.RETRY,
    processing: false
  }
}
const taskStatus = useTaskStore().$state
const parentTaskStatus = useParentTaskStore().$state
const status: Ref<number | undefined | null> = computed(() => {
  let tempStatus: number | undefined | null
  if (props.row.hasChildren) {
    tempStatus = parentTaskStatus.get(props.row.id as number)?.status
  } else {
    tempStatus = taskStatus.get(props.row.id as number)?.status
  }
  return IsNullish(tempStatus) ? props.row.status : tempStatus
})
const schedule: Ref<number> = computed(() => {
  let tempSchedule: number | undefined | null
  if (props.row.hasChildren) {
    tempSchedule = parentTaskStatus.get(props.row.id as number)?.schedule
  } else {
    tempSchedule = taskStatus.get(props.row.id as number)?.schedule
  }
  return IsNullish(tempSchedule) ? 0 : Math.round(tempSchedule * 100) / 100
})
const fractions: Ref<string> = computed(() => {
  if (props.row.hasChildren) {
    const parentTask = parentTaskStatus.get(props.row.id as number)
    if (IsNullish(parentTask?.total)) {
      return ''
    }
    return (IsNullish(parentTask?.finished) ? 0 : parentTask.finished) + '/' + parentTask.total
  } else {
    return ''
  }
})
// 方法
// 任务状态映射为按钮状态
function mapToButtonStatus(): {
  tooltip: string
  icon: string
  operation: TaskOperationCodeEnum
  processing: boolean
} {
  if (NotNullish(status.value)) {
    return taskStatusMapping[status.value]
  } else {
    return taskStatusMapping['0']
  }
}
</script>

<template>
  <div>
    <el-button-group
      v-show="
        (status !== TaskStatusEnum.PROCESSING && status !== TaskStatusEnum.WAITING && status !== TaskStatusEnum.PAUSE) ||
        row.hasChildren
      "
      style="margin-left: auto; margin-right: auto; flex-shrink: 0"
    >
      <el-tooltip v-if="props.row.isCollection" :enterable="false" :show-after="650" :hide-after="0" content="详情">
        <el-button size="small" icon="View" @click="buttonClicked(row, TaskOperationCodeEnum.VIEW)" />
      </el-tooltip>
      <el-tooltip :content="mapToButtonStatus().tooltip" :enterable="false" :show-after="650" :hide-after="0">
        <el-button
          size="small"
          :icon="mapToButtonStatus().icon"
          :loading="mapToButtonStatus().processing && !row.continuable && !row.isCollection"
          @click="buttonClicked(row, mapToButtonStatus().operation)"
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
          (status === TaskStatusEnum.PROCESSING || status === TaskStatusEnum.WAITING || status === TaskStatusEnum.PAUSE) &&
          row.hasChildren
        "
      >
        <el-progress style="width: 100%" :percentage="schedule" text-inside :stroke-width="15" striped striped-flow :duration="5">
          <template #default="{ percentage }">
            <span style="font-size: 14px; width: 100px">
              {{ percentage + '% ' }}
            </span>
            <span>
              {{ fractions }}
            </span>
          </template>
        </el-progress>
      </div>
    </transition>
    <el-progress
      v-show="
        (status === TaskStatusEnum.PROCESSING || status === TaskStatusEnum.WAITING || status === TaskStatusEnum.PAUSE) &&
        !row.hasChildren
      "
      style="width: 100%"
      :percentage="schedule"
      text-inside
      :stroke-width="24"
      striped
      striped-flow
      :duration="5"
      @click="buttonClicked(row, mapToButtonStatus().operation)"
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
