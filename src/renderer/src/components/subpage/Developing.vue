<script setup lang="ts">
import BaseSubpage from '@renderer/components/subpage/BaseSubpage.vue'
import { HotWater } from '@element-plus/icons-vue'
import daBing from '../../../../../resources/da-bing.png'

// props
const props = defineProps<{ closeSignal: EventTarget }>()
</script>

<template>
  <base-subpage :close-signal="props.closeSignal">
    <el-empty style="height: 100%; background-color: #fafafa" description=" " :image="daBing">
      <el-icon size="large"><HotWater /></el-icon>
      开发中...
    </el-empty>
  </base-subpage>
</template>

<style scoped></style>
