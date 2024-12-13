<script setup lang="ts">
import IPage from '@renderer/model/util/IPage.ts'
import Page from '@renderer/model/util/Page.ts'
import BaseQueryDTO from '../../model/main/queryDTO/BaseQueryDTO'
import { computed, onMounted, Ref, ref, UnwrapRef, watch } from 'vue'
import SelectItem from '../../model/util/SelectItem'
import TagBox from '@renderer/components/common/TagBox.vue'
import lodash from 'lodash'
import { Close } from '@element-plus/icons-vue'
import { notNullish } from '@renderer/utils/CommonUtil.ts'

// props
const props = defineProps<{
  load: (page: IPage<BaseQueryDTO, SelectItem>, input?: string) => Promise<IPage<BaseQueryDTO, SelectItem>>
}>()

//
onMounted(() => {
  if (notNullish(wrapper.value)) {
    console.log(wrapper.value)
  }
})

// 变量
// 最外部div的实例
const wrapper = ref()
// 可选择数据TagBox组件的实例
const optionalTagBox = ref()
// input的实例
const inputElement = ref()
// hiddenSpan的实例
const hiddenSpan = ref()
// 输入
const input: Ref<UnwrapRef<string | undefined>> = ref()
// 已选数据
const selectedData: Ref<UnwrapRef<SelectItem[]>> = ref([])
// 分页参数
const page: Ref<UnwrapRef<IPage<BaseQueryDTO, SelectItem>>> = ref(new Page<BaseQueryDTO, SelectItem>())
// 可选数据
const optionalData: Ref<UnwrapRef<SelectItem[]>> = ref([])
// 总体宽度
const width: Ref<UnwrapRef<number>> = computed(() => {
  if (notNullish(wrapper.value)) {
    console.log(wrapper.value)
  }
  return 1000
})
// 输入框宽度
const inputWidth: Ref<UnwrapRef<string>> = ref('11px')

// 方法
// 加载分页的函数
function innerLoad() {
  const tempPage = lodash.cloneDeep(page.value)
  return props.load(tempPage, input.value)
}
// 重新分页查询
function newSearch() {
  optionalTagBox.value.newSearch()
}
// 处理标签点击事件
function handelTagClicked(tag: SelectItem) {
  selectedData.value.push(tag)
}
// 处理标签关闭按钮点击事件
function handelTagClosed(tag: SelectItem) {
  const index = selectedData.value.indexOf(tag)
  if (index > -1) {
    selectedData.value.splice(index, 1)
  }
}
// 清除所有选择
function clear() {
  selectedData.value = []
}

// watch
watch(input, () => {
  inputWidth.value = hiddenSpan.value.offsetWidth + 11 + 'px'
})
</script>

<template>
  <el-popover :width="width">
    <template #reference>
      <div ref="wrapper" class="auto-load-tag-select-selected-wrapper rounded-borders">
        <tag-box
          class="auto-load-tag-select-selected"
          v-model:data="selectedData"
          tag-closeable
          @tag-close="handelTagClosed"
          @click="inputElement.focus()"
        >
          <template #tail>
            <input ref="inputElement" class="auto-load-tag-select-input" v-model="input" @focus="newSearch" @input="newSearch" />
            <span ref="hiddenSpan" style="visibility: hidden">{{ input }}</span>
          </template>
        </tag-box>
        <div class="segmented-tag-sub-close-wrapper">
          <button class="segmented-tag-sub-close" @click="clear">
            <el-icon color="rgb(166.2, 168.6, 173.4, 75%)"><Close /></el-icon>
          </button>
        </div>
      </div>
    </template>
    <template #default>
      <tag-box
        ref="optionalTagBox"
        class="auto-load-tag-select-optional"
        v-model:page="page"
        v-model:data="optionalData"
        :load="innerLoad"
        @tag-clicked="handelTagClicked"
      />
    </template>
  </el-popover>
</template>

<style scoped>
.auto-load-tag-select-selected-wrapper {
  display: flex;
}
.auto-load-tag-select-selected {
  height: 100%;
  width: calc(100% - 30px);
  background-color: #ffffff;
  cursor: text;
  transition: height ease 1s;
}
.segmented-tag-sub-close-wrapper {
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(166.2, 168.6, 173.4, 5%);
}
.segmented-tag-sub-close {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 设置宽度和高度相等，以确保按钮是正圆 */
  width: 20px;
  height: 20px;
  margin-left: 3px;
  margin-right: 3px;

  /* 圆角半径设置为50%以形成圆形 */
  border-radius: 50%;

  background-color: rgb(166.2, 168.6, 173.4, 30%);
  border: none; /* 无边框 */
  cursor: pointer; /* 鼠标悬停时显示为手型指针 */

  transition-duration: 0.4s;
}
.segmented-tag-sub-close:hover {
  width: 25px;
  height: 25px;
  background-color: #ffffff;
  transition-duration: 0.2s;
}
.auto-load-tag-select-input {
  width: v-bind(inputWidth);
  appearance: none;
  background-color: transparent;
  border: none;
  color: rgb(166.2, 168.6, 173.4);
  font-family: inherit;
  font-size: inherit;
  height: 24px;
  max-width: 100%;
  outline: none;
  padding: 0;
}
.auto-load-tag-select-optional {
  height: 300px;
}
</style>
