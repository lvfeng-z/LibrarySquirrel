<script setup lang="ts">
import BaseSubpage from '@renderer/components/subpage/BaseSubpage.vue'
import { onMounted, ref, toRaw, UnwrapRef } from 'vue'
import { Picture } from '@element-plus/icons-vue'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import Page from '@renderer/model/util/Page.ts'

// 站点浏览器数据接口
interface SiteBrowserItem {
  pluginPublicId: string
  siteBrowserId: string
  name: string
  imagePath: string
  pluginId: number
}

// 站点浏览器列表
const siteBrowserList = ref<SiteBrowserItem[]>([])

// 分页参数
const page = ref<UnwrapRef<Page<object, SiteBrowserItem>>>(new Page<object, SiteBrowserItem>())

// 查询站点浏览器列表
async function querySiteBrowserList() {
  page.value.pageSize = 100 // 获取所有数据
  const response = await window.api.siteBrowserQueryPage(toRaw(page.value))
  if (ApiUtil.check(response)) {
    const resultPage = ApiUtil.data<Page<object, SiteBrowserItem>>(response)
    if (resultPage?.data) {
      siteBrowserList.value = resultPage.data
    }
  } else {
    ApiUtil.msg(response)
  }
}

onMounted(() => {
  querySiteBrowserList()
})

// 处理卡片点击事件 - 打开站点浏览器
async function handleCardClick(item: SiteBrowserItem) {
  const response = await window.api.siteBrowserOpen(item.pluginPublicId, item.siteBrowserId)
  if (!ApiUtil.check(response)) {
    ApiUtil.msg(response)
  }
}
</script>

<template>
  <base-subpage>
    <template #default>
      <div class="site-browser-manage-container">
        <el-scrollbar>
          <div class="site-browser-grid">
            <div
              v-for="item in siteBrowserList"
              :key="item.pluginPublicId + item.siteBrowserId"
              class="site-browser-card"
              @click="handleCardClick(item)"
            >
              <div class="site-browser-card-image">
                <el-image :src="`resource://workdir${item.imagePath}`" fit="cover" class="site-browser-image">
                  <template #error>
                    <div class="site-browser-image-error">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
              </div>
              <div class="site-browser-card-name">{{ item.name }}</div>
            </div>
          </div>
        </el-scrollbar>
      </div>
    </template>
  </base-subpage>
</template>

<style scoped>
.site-browser-manage-container {
  background: #f4f4f4;
  border-radius: 6px;
  width: 100%;
  height: 100%;
  padding: 5px;
  box-sizing: border-box;
}

.site-browser-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 20px;
  padding: 10px;
  width: 100%;
  box-sizing: border-box;
}

.site-browser-card {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.site-browser-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.site-browser-card-image {
  width: 100%;
  aspect-ratio: 1;
  background: var(--el-fill-color-light);
  overflow: hidden;
  border-radius: 8px 8px 0 0;
}

.site-browser-image {
  width: 100%;
  height: 100%;
}

.site-browser-image-error {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: var(--el-text-color-secondary);
  font-size: 48px;
}

.site-browser-card-name {
  padding: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  text-align: center;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  word-break: break-word;
}
</style>
