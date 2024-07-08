<script setup lang="ts">
import { ref } from 'vue'
import Site from '../model/main/Site'
import LocalTag from '../model/main/LocalTag'
import WorksDTO from '../model/main/dto/WorksDTO'
import lodash from 'lodash'
import SiteAuthorDTO from '../model/main/dto/SiteAuthorDTO'

// 变量
// 接口
const apis = {
  worksSaveWorks: window.api.worksSaveWorks,
  testTransactionTest: window.api.testTransactionTest
}
const site = ref(new Site())
const siteAuthor = ref(new SiteAuthorDTO())
const localTag = ref(new LocalTag())

// 方法
function saveWorks() {
  const worksDTO = new WorksDTO()
  worksDTO.site = lodash.cloneDeep(site.value)
  const siteAuthors: SiteAuthorDTO[] = []
  siteAuthors.push(lodash.cloneDeep(siteAuthor.value))
  worksDTO.siteAuthors = siteAuthors
  worksDTO.localTags = lodash.cloneDeep([localTag.value])
  apis.worksSaveWorks(worksDTO)
  // apis.testTransactionTest()
}
</script>

<template>
  <el-dialog>
    <el-form>
      <el-row>
        <el-col>
          <el-form-item label="站点域名">
            <el-input v-model="site.siteDomain"></el-input>
          </el-form-item>
        </el-col>
        <el-col>
          <el-form-item label="站点名称">
            <el-input v-model="site.siteName"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col>
          <el-form-item label="站点作者id">
            <el-input v-model="siteAuthor.siteAuthorId"></el-input>
          </el-form-item>
        </el-col>
        <el-col>
          <el-form-item label="站点作者名称">
            <el-input v-model="siteAuthor.siteAuthorName"></el-input>
          </el-form-item>
        </el-col>
        <el-col>
          <el-form-item label="站点作者所在站点Id">
            <el-input v-model="siteAuthor.siteId"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col>
          <el-form-item label="本地标签id">
            <el-input v-model="localTag.id"></el-input>
          </el-form-item>
        </el-col>
        <el-col>
          <el-form-item label="本地标签名称">
            <el-input v-model="localTag.localTagName"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <el-button @click="saveWorks">保存</el-button>
  </el-dialog>
</template>

<style scoped></style>
