<script setup lang="ts">
import BaseSubpage from '@renderer/components/subpage/BaseSubpage.vue'
import { onMounted, ref } from 'vue'
import { Picture } from '@element-plus/icons-vue'

// 模拟的站点浏览器数据接口
interface SiteBrowserItem {
  id: string
  name: string
  imagePath: string
  pluginId: number
}

// 模拟数据 - 实际应该从后端获取
const siteBrowserList = ref<SiteBrowserItem[]>([
  {
    id: '1',
    name: 'Pixiv',
    imagePath: '/plugins/pixiv/icon.png',
    pluginId: 1
  },
  {
    id: '2',
    name: 'Bilibili',
    imagePath: '/plugins/bilibili/icon.png',
    pluginId: 2
  },
  {
    id: '3',
    name: 'Twitter',
    imagePath: '/plugins/twitter/icon.png',
    pluginId: 3
  },
  {
    id: '4',
    name: 'Danbooru',
    imagePath: '/plugins/danbooru/icon.png',
    pluginId: 4
  },
  {
    id: '5',
    name: 'ArtStation',
    imagePath: '/plugins/artstation/icon.png',
    pluginId: 5
  },
  {
    id: '6',
    name: 'DeviantArt',
    imagePath: '/plugins/deviantart/icon.png',
    pluginId: 6
  }
])

onMounted(() => {
  // 实际项目中，这里应该调用后端 API 获取站点浏览器列表
  // const response = await window.api.siteBrowserList()
  // if (ApiUtil.check(response)) {
  //   siteBrowserList.value = ApiUtil.data(response)
  // }
})

// 处理卡片点击事件
function handleCardClick(item: SiteBrowserItem) {
  console.log('Clicked site browser:', item.name)
  // 实际项目中，这里应该打开站点浏览器或执行相应操作
}
</script>

<template>
  <base-subpage>
    <template #default>
      <div class="site-browser-manage-container">
        <el-scrollbar>
          <div class="site-browser-grid">
            <div v-for="item in siteBrowserList" :key="item.id" class="site-browser-card" @click="handleCardClick(item)">
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
