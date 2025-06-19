<script setup lang="ts">
import { ref } from 'vue'
import { ElTreeSelect } from 'element-plus'
import { useTaskStore } from '@renderer/store/UseTaskStore.ts'
import { useParentTaskStore } from '@renderer/store/UseParentTaskStore.ts'
import BaseSubpage from '@renderer/components/subpage/BaseSubpage.vue'

const value = ref()
const value2 = ref(5)

const taskStatus = useTaskStore().$state
const parentTaskStatus = useParentTaskStore().$state

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
  <base-subpage>
    <button class="button">hover me</button>
    <div class="wrapper">
      <div class="content"></div>
    </div>
    <el-tree-select v-model="value" lazy :load="load" :props="props" style="width: 240px" />
    <el-divider />
    <el-tree-select v-model="value2" lazy :load="load" :props="props" :cache-data="cacheData" style="width: 240px" />
    <div>
      <template v-for="item in parentTaskStatus.values()" :key="item.id">
        <span style="white-space: nowrap">
          {{ 'id: ' + item.id + ', taskName: ' + item.taskName + ', pid:' + item.pid + ', status: ' + item.status }}
        </span>
        <br />
      </template>
    </div>
    <div>
      <template v-for="item in taskStatus.values()" :key="item.task.id">
        <span style="white-space: nowrap">
          {{
            'id: ' +
            item.task.id +
            ', taskName: ' +
            item.task.taskName +
            ', pid:' +
            item.task.pid +
            ', status: ' +
            item.task.status +
            ', finished: ' +
            item.task.finished +
            ', total: ' +
            item.task.total
          }}
        </span>
        <br />
      </template>
    </div>
    <el-button @click="console.log(taskStatus)">test</el-button>
  </base-subpage>
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
