<template>
  <div class="institution-menu">
    <div class="menu-search">
      <el-select
        v-model="form.department"
        size="small"
        placeholder="请选择部门"
        style="width: 200px"
      >
        <el-option
          v-for="item of departmentList"
          :key="item.id"
          :label="item.title"
          :value="item.title"
        ></el-option>
      </el-select>
      <el-input
        v-model="form.content"
        size="small"
        placeholder="请输入需搜索的内容"
        style="width: 200px"
        suffix-icon="el-icon-search"
      ></el-input>
      <el-button type="primary" size="small">更多搜索</el-button>
    </div>
    <el-menu unique-opened default-active="2-1-1" class="institution-el-menu">
      <div v-if="menuList && menuList.length">
        <div v-for="item of menuList" :key="item.id">
          <el-sub-menu v-if="item.list && item.list.length" :index="item.id">
            <template #title>
              <i>{{ item.name }}</i>
            </template>
            <div v-for="it of item.list" :key="it.id">
              <el-sub-menu v-if="it.list && it.list.length" :index="it.id" class="sub-menu">
                <template #title>
                  <span>{{ it.name }}</span>
                </template>
                <div v-for="i of it.list" :key="i.id">
                  <el-sub-menu v-if="i.list && i.list.length" :index="i.id" class="sub-menu">
                    <template #title>
                      <span>{{ i.name }}</span>
                    </template>
                    <div v-for="e of i.list" :key="e.id">
                      <el-sub-menu v-if="e.list && e.list.length" :index="e.id" class="sub-menu">
                        <template #title>
                          <span>{{ e.name }}</span>
                        </template>
                        <div v-for="l of e.list" :key="l.id">
                          <!-- <div v-if="l.list && l.list.length"> -->
                          <el-menu-item :index="l.id">{{ l.name }}</el-menu-item>
                          <!-- </div> -->
                        </div>
                      </el-sub-menu>
                      <div v-else>
                        <el-menu-item :index="e.id">{{ e.name }}</el-menu-item>
                      </div>
                    </div>
                  </el-sub-menu>
                  <div v-else>
                    <el-menu-item :index="i.id">{{ i.name }}</el-menu-item>
                  </div>
                </div>
              </el-sub-menu>
              <div v-else>
                <el-menu-item :index="it.id">{{ it.name }}</el-menu-item>
              </div>
            </div>
          </el-sub-menu>
          <el-menu-item v-else :index="item.id">
            <i>{{ item.name }}</i>
          </el-menu-item>
        </div>
      </div>
      <div
        v-else
        style="
          width: calc(100vw - 200px);
          height: 70px;
          background: #fff;
          line-height: 70px;
          text-align: center;
        "
      >
        - 暂无数据 -
      </div>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 变量
const form = ref({
  department: '',
  content: ''
})
const departmentList = ref([
  { title: '111', id: 111 },
  { title: '222', id: 222 },
  { title: '333', id: 333 }
])
const menuList = ref([
  {
    name: 'first',
    id: '1',
    list: [
      {
        name: 'first-1',
        id: '1-1',
        list: [
          {
            name: 'first-1-1',
            id: '1-1-1',
            list: [
              {
                name: 'first-1-1-1',
                id: '1-1-1-1',
                list: [
                  {
                    name: 'first-1-1-1-1',
                    id: '1-1-1-1-1'
                  },
                  {
                    name: 'first-1-1-1-2',
                    id: '1-1-1-1-2'
                  }
                ]
              },
              {
                name: 'first-1-1-2',
                id: '1-1-1-2'
              }
            ]
          },
          {
            name: 'first-1-2',
            id: '1-1-2'
          }
        ]
      },
      {
        name: 'first-2',
        id: '2-1'
      }
    ]
  },
  {
    name: 'second',
    id: '2',
    list: [
      {
        name: 'second-1',
        id: '2-1',
        list: [
          {
            name: 'second-1-1',
            id: '2-1-1'
          }
        ]
      }
    ]
  },
  {
    name: 'third',
    id: '3'
  }
])
</script>
<style lang="scss" scoped>
.institution-menu {
  height: calc(100vh - 160px);
  width: 100%;
  padding: 10px;
}
.institution-el-menu {
  margin: 20px 50px;
}
.menu-search {
  display: flex;
  justify-content: center;
}
.el-menu-item i {
  color: #333;
}
i {
  font-style: inherit;
  font-size: 14px;
}
.el-menu-item {
  padding: 0;
  min-width: 200px;
  background-color: #eee;
}
.el-sub-menu {
  min-width: 200px;
}
.el-sub-menu__title i {
  color: #fff;
}
.el-menu--collapse {
  width: 200px;
}
.el-menu {
  width: 200px;
}
/deep/.el-sub-menu {
  position: relative;
}
/deep/.el-menu--inline {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 200px;
}
</style>
