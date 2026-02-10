<script setup lang="ts">
import { Ref, ref, watch } from 'vue'
import { ArrayNotEmpty, IsNullish } from '@renderer/utils/CommonUtil.ts'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import WorkFullDTO from '@renderer/model/main/dto/WorkFullDTO.ts'
import WorkSetWithWorkDTO from '@renderer/model/main/dto/WorkSetWithWorkDTO.ts'
import AutoHeightDialog from '@renderer/components/dialogs/AutoHeightDialog.vue'
import WorkGridForWorkSet from '@renderer/components/common/WorkGridForWorkSet.vue'
import WorkSet from '@renderer/model/main/entity/WorkSet.ts'
import { Edit, Delete, Close } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// props
const props = defineProps<{
  width?: string
}>()

// model
// 弹窗开关
const state = defineModel<boolean>('state', { required: true })
const currentWorkSetId = defineModel<number>('currentWorkSetId', { required: true })

// 变量
// 是否启用选择模式
const isCheckable = ref(false)
// 选中的作品id列表
const checkedWorkIds = ref<number[]>([])
// 接口
const apis = {
  workSetListWorkSetWithWorkByIds: window.api.workSetListWorkSetWithWorkByIds,
  reWorkWorkSetRemoveBatchFromWorkSet: window.api.reWorkWorkSetRemoveBatchFromWorkSet
}
// 当前作品集
const currentWorkSet = ref<WorkSet | undefined>(undefined)
// 作品列表
const workList: Ref<WorkFullDTO[]> = ref([])
// 当前作品的索引
const currentWorkIndex = ref(0)

// 方法
async function loadWorkList() {
  if (IsNullish(currentWorkSetId.value)) {
    return
  }
  const workSetId = currentWorkSetId.value
  const response = await apis.workSetListWorkSetWithWorkByIds([workSetId])
  if (ApiUtil.check(response)) {
    const workSetList = ApiUtil.data<WorkSetWithWorkDTO[]>(response)
    if (ArrayNotEmpty(workSetList)) {
      currentWorkSet.value = workSetList[0].workSet
      workList.value = workSetList[0].workList.map((origin) => new WorkFullDTO(origin))
      currentWorkIndex.value = 0
    }
  }
}

// 移除按钮点击处理
async function handleDelete() {
  if (checkedWorkIds.value.length === 0) {
    ElMessage({
      type: 'warning',
      message: '请先选择要移除的作品'
    })
    return
  }

  try {
    // 确认对话框
    await ElMessageBox.confirm(`确定要从作品集中移除选中的 ${checkedWorkIds.value.length} 个作品吗？`, '确认移除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const workIds = [...checkedWorkIds.value] // 创建数组副本避免传递响应式对象
    const workSetId = currentWorkSetId.value
    const response = await apis.reWorkWorkSetRemoveBatchFromWorkSet({
      workIds,
      workSetId
    })

    if (ApiUtil.check(response)) {
      const deletedCount = ApiUtil.data<number>(response)
      ElMessage({
        type: 'success',
        message: `成功从作品集中移除 ${deletedCount} 个作品`
      })
      // 重新加载作品列表
      await loadWorkList()
      // 清空选中状态
      checkedWorkIds.value = []
    } else {
      ElMessage({
        type: 'error',
        message: `移除作品失败: ${response.msg || '未知错误'}`
      })
    }
  } catch (error) {
    // 用户取消移除
    if (error === 'cancel' || error === 'close') {
      return
    }
    ElMessage({
      type: 'error',
      message: `移除作品失败: ${error}`
    })
  }
}

// 处理选中状态变化
function handleCheckedChange(ids: number[]) {
  checkedWorkIds.value = ids
}

// watch
watch(currentWorkSetId, () => loadWorkList())
watch(isCheckable, (newValue) => {
  if (!newValue) {
    // 退出管理模式时清空选中状态
    checkedWorkIds.value = []
  }
})
</script>

<template>
  <auto-height-dialog v-model:state="state" :width="props.width">
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
        <span>{{ currentWorkSet?.siteWorkSetName }}</span>
        <div v-if="!isCheckable">
          <el-button type="primary" :plain="true" @click="isCheckable = true">
            <el-icon><Edit /></el-icon>
            管理
          </el-button>
        </div>
        <div v-else style="display: flex; gap: 8px">
          <el-button type="danger" @click="handleDelete">
            <el-icon><Delete /></el-icon>
            移除
          </el-button>
          <el-button @click="isCheckable = false">
            <el-icon><Close /></el-icon>
            取消
          </el-button>
        </div>
      </div>
    </template>
    <work-grid-for-work-set
      v-model:current-work-set-id="currentWorkSetId"
      v-model:current-work-index="currentWorkIndex"
      :work-list="workList"
      :checkable="isCheckable"
      :checked-work-ids="checkedWorkIds"
      @checked-change="handleCheckedChange"
    />
  </auto-height-dialog>
</template>

<style scoped></style>
