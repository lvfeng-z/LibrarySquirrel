<script setup lang="ts">
import BaseSubpage from '@renderer/components/subpage/BaseSubpage.vue'
import { ref } from 'vue'
import { Discount, Link, List, TakeawayBox, User } from '@element-plus/icons-vue'
import { useTourStatesStore } from '@renderer/store/UseTourStatesStore.ts'

// 变量
const activeName = ref('localTag')

function startTour() {
  // TODO 打开向导
  useTourStatesStore().tourStates.startTaskTour()
}
</script>
<template>
  <base-subpage>
    <template #default>
      <div class="guide-container">
        <el-tabs v-model="activeName" class="guide-container-tabs" type="border-card">
          <el-tab-pane name="localTag">
            <template #label>
              <span class="guide-tabs-label">
                <el-icon class="guide-tabs-label-icon-local"><Discount /></el-icon>
                <span class="guide-tabs-label-text">本地标签</span>
              </span>
            </template>
            <div class="guide-container-tabs-content">
              <p>
                本地创建的标签，可以与站点标签进行关联，在使用本地标签搜索时，包含与本地标签关联的站点标签的作品也会被搜索到。
                <br />
                例如：本地标签LT关联了站点标签ST，作品W包含ST标签，此时搜索包含LT的作品时，无论作品W是否包含LT标签，作品W会被搜索到。
              </p>
            </div>
          </el-tab-pane>
          <el-tab-pane name="siteTag">
            <template #label>
              <span class="guide-tabs-label">
                <el-icon class="guide-tabs-label-icon-site"><Discount /></el-icon>
                <span class="guide-tabs-label-text">站点标签</span>
              </span>
            </template>
            <div class="guide-container-tabs-content">
              <p>
                来自站点的标签，只能在使用插件下载站点作品时被添加。
                <br />
                站点标签能且只能与一个本地标签进行关联，在使用本地标签搜索时，包含与本地标签关联的站点标签的作品也会被搜索到。
                <br />
                例如：本地标签LT关联了站点标签ST，作品W包含ST标签，此时搜索包含LT的作品时，无论作品W是否包含LT标签，作品W会被搜索到。
              </p>
            </div>
          </el-tab-pane>
          <el-tab-pane name="localAuthor">
            <template #label>
              <span class="guide-tabs-label">
                <el-icon class="guide-tabs-label-icon-local"><User /></el-icon>
                <span class="guide-tabs-label-text">本地作者</span>
              </span>
            </template>
            <div class="guide-container-tabs-content">
              <p>
                本地创建的作者，可以与站点作者进行关联，在使用本地作者搜索时，包含与本地作者关联的站点作者的作品也会被搜索到。
                <br />
                例如：本地作者LA关联了站点作者SA，作品W包含SA作者，此时搜索包含LA的作品时，无论作品W是否包含LA作者，作品W会被搜索到。
              </p>
            </div>
          </el-tab-pane>
          <el-tab-pane name="siteAuthor">
            <template #label>
              <span class="guide-tabs-label">
                <el-icon class="guide-tabs-label-icon-site"><User /></el-icon>
                <span class="guide-tabs-label-text">站点作者</span>
              </span>
            </template>
            <div class="guide-container-tabs-content">
              <p>
                来自站点的作者，只能在使用插件下载站点作品时被添加。
                <br />
                站点作者能且只能与一个本地作者进行关联，在使用本地作者搜索时，包含与本地作者关联的站点作者的作品也会被搜索到。
                <br />
                例如：本地作者LA关联了站点作者SA，作品W包含SA作者，此时搜索包含LA的作品时，无论作品W是否包含LA作者，作品W会被搜索到。
              </p>
            </div>
          </el-tab-pane>
          <el-tab-pane name="collection">
            <template #label>
              <span class="guide-tabs-label">
                <el-icon class="guide-tabs-label-icon-normal"><Star /></el-icon>
                <span class="guide-tabs-label-text">收藏</span>
              </span>
            </template>
            <div class="guide-container-tabs-content">
              <p>功能开发中</p>
            </div>
          </el-tab-pane>
          <el-tab-pane name="site">
            <template #label>
              <span class="guide-tabs-label">
                <el-icon class="guide-tabs-label-icon-normal"><Link /></el-icon>
                <span class="guide-tabs-label-text">站点</span>
              </span>
            </template>
            <div class="guide-container-tabs-content">
              <p>指远程的作品源，如bilibili、pixiv等站点，站点标签、站点作者、作品、插件都要基于站点创建。</p>
            </div>
          </el-tab-pane>
          <el-tab-pane name="task">
            <template #label>
              <span class="guide-tabs-label">
                <el-icon class="guide-tabs-label-icon-normal"><List /></el-icon>
                <span class="guide-tabs-label-text">任务</span>
              </span>
            </template>
            <div class="guide-container-tabs-content">
              <p>
                任务用于创建作品，要创建任务，可在任务页面输入受支持的url（默认支持本地文件路径和pixiv作品的url）进行创建。在创建任务之后，点击开始任务，
                等待任务完成后，作品的创建就完成了。
              </p>
              <el-button class="guide-container-tabs-tour-button" type="primary" @click="startTour">打开向导</el-button>
            </div>
          </el-tab-pane>
          <el-tab-pane name="plugin">
            <template #label>
              <span class="guide-tabs-label">
                <el-icon class="guide-tabs-label-icon-normal"><TakeawayBox /></el-icon>
                <span class="guide-tabs-label-text">插件</span>
              </span>
            </template>
            <div class="guide-container-tabs-content">
              <p>插件用于扩展本软件对于不同站点的作品下载的支持，软件预置了用于从本地导入作品和pixiv下载作品的两个插件</p>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
  </base-subpage>
</template>

<style scoped>
.guide-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: calc(100% - 20px);
  height: calc(100% - 20px);
  padding: 5px;
  margin: 5px;
}
.guide-container-tabs {
  height: 100%;
  width: 100%;
}

.guide-container-tabs-content {
  display: flex;
  flex-direction: column;
  background: #f4f4f4;
  border-radius: 6px;
  width: calc(100% - 20px);
  height: calc(100% - 20px);
  padding: 5px;
  margin: 5px;
}
.guide-container-tabs-tour-button {
  margin: auto;
}
.guide-tabs-label {
  display: flex;
  align-items: center;
}
.guide-tabs-label-icon-normal {
  border-radius: 50% / 50%;
  background-color: rgb(224, 229, 237);
  padding: 2px;
}
.guide-tabs-label-icon-local {
  border-radius: 50% / 50%;
  background-color: rgb(245, 108, 108, 70%);
  color: white;
  padding: 2px;
}
.guide-tabs-label-icon-site {
  border-radius: 50% / 50%;
  background-color: rgb(64, 158, 255, 65%);
  color: white;
  padding: 2px;
}
.guide-tabs-label-text {
  border-radius: 5px;
  padding-left: 2px;
}
</style>
