<script setup lang="ts">
import { ref } from 'vue'

const value = ref()
const value2 = ref(5)

const cacheData = [
  { value: 5, label: 'lazy load node5' },
  { value: 6, label: 'lazy load node5' }
]

const props = {
  label: 'label',
  children: 'children',
  isLeaf: 'isLeaf'
}

let id = 0

const load = (node, resolve) => {
  if (node.isLeaf) return resolve([])

  const r = [
    {
      value: ++id,
      label: `lazy load node${id}`
    },
    {
      value: ++id,
      label: `lazy load node${id}`,
      isLeaf: true
    }
  ]
  setTimeout(() => {
    resolve(r)
  }, 1)
}
</script>

<template>
  <div>
    <button class="button">hover me</button>
    <div class="wrapper">
      <div class="content"></div>
    </div>
    <el-tree-select v-model="value" lazy :load="load" :props="props" style="width: 240px" />
    <el-divider />
    <VersionTag version="2.2.26" /> show lazy load label:
    <el-tree-select v-model="value2" lazy :load="load" :props="props" :cache-data="cacheData" style="width: 240px" />
  </div>
</template>

<style scoped>
.wrapper {
  width: 0;
  overflow: hidden;
  transition: width 1s;
}

.content {
  width: 200px;
  height: 100px;
  background-color: #f0dc4e;
}

.button:hover ~ .wrapper {
  width: auto;
}
</style>
