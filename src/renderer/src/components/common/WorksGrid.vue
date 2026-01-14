<script setup lang="ts">
import WorksFullDTO from '@renderer/model/main/dto/WorksFullDTO.ts'
import WorksCard from './WorksCard.vue'
import WorksDialog from '../dialogs/WorksDialog.vue'
import { Ref, ref } from 'vue'
import WorksSetDialog from '@renderer/components/dialogs/WorksSetDialog.vue'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

// props
const props = defineProps<{
  worksList: WorksFullDTO[]
  worksSetDisabled: boolean
}>()

// model
const currentWorksIndex = defineModel<number>('currentWorksIndex', { required: true })

// 变量
// worksDialog开关
const worksDialogState: Ref<boolean> = ref(false)
// worksSetDialogState开关
const worksSetDialogState: Ref<boolean> = ref(false)
// 当前作品集id
const currentWorksSetId: Ref<number> = ref(-1)

// 方法
function handleImageClicked(works: WorksFullDTO) {
  currentWorksIndex.value = props.worksList.indexOf(works)
  worksDialogState.value = true
}
// 打开作品集dialog
async function openWorksSetDialog() {
  worksDialogState.value = false
  worksSetDialogState.value = true
  const temp = props.worksList[currentWorksIndex.value].worksSets?.[0].id
  if (NotNullish(temp)) {
    currentWorksSetId.value = temp
  }
}
</script>

<template>
  <div class="works-grid">
    <template v-for="works in props.worksList" :key="works.id ? works.id : Math.random()">
      <div class="works-grid-container">
        <works-card
          class="works-grid-works-case"
          :works="works"
          :max-height="500"
          :max-width="500"
          author-info-popper-width="380px"
          @image-clicked="handleImageClicked"
        />
      </div>
    </template>
    <div class="works-grid-dialog-wrapper">
      <works-dialog
        v-if="worksDialogState"
        v-model="worksDialogState"
        v-model:current-works-index="currentWorksIndex"
        :works="props.worksList"
        @open-works-set="openWorksSetDialog"
      />
      <works-set-dialog
        v-if="!worksSetDisabled"
        v-model:state="worksSetDialogState"
        v-model:current-works-set-id="currentWorksSetId"
        width="90%"
      />
    </div>
  </div>
</template>

<style scoped>
.works-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.works-grid-container {
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  margin: 5px 5px 0;
  padding: 4px;
  border-radius: 10px;
  background-color: rgb(166.2, 168.6, 173.4, 10%);
  transition-duration: 0.3s;
}
.works-grid-container:hover {
  background-color: rgb(166.2, 168.6, 173.4, 30%);
  filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.2));
}
.works-grid-works-case {
  height: 100%;
}
</style>
