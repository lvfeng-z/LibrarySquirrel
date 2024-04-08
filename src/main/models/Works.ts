/**
 * 作品
 */
export default class Works {
  id: number //主键
  filePath: string //文件存储路径
  siteId: number //作品来源站点id
  siteWorksId: string //作品在站点的id
  siteAuthorId: string //作品在站点的作者id
  siteUploadTime: string //作品在站点的上传时间
  siteUpdateTime: string //作品在站点最后修改的时间
  nickName: string //作品别称
  localAuthor: number //作品在本地的作者id
  downloadTime: string //下载时间
  downloadStatus: number //下载状态
  downloadTaskId: number //下载任务id
  constructor(
    id: number, //主键
    filePath: string, //文件存储路径
    siteId: number, //作品来源站点id
    siteWorksId: string, //作品在站点的id
    siteAuthorId: string, //作品在站点的作者id
    siteUploadTime: string, //作品在站点的上传时间
    siteUpdateTime: string, //作品在站点最后修改的时间
    nickName: string, //作品别称
    localAuthor: number, //作品在本地的作者id
    downloadTime: string, //下载时间
    downloadStatus: number, //下载状态
    downloadTaskId: number //下载任务id
  ) {
    this.id = id
    this.filePath = filePath
    this.siteId = siteId
    this.siteWorksId = siteWorksId
    this.siteAuthorId = siteAuthorId
    this.siteUploadTime = siteUploadTime
    this.siteUpdateTime = siteUpdateTime
    this.nickName = nickName
    this.localAuthor = localAuthor
    this.downloadTime = downloadTime
    this.downloadStatus = downloadStatus
    this.downloadTaskId = downloadTaskId
  }
}
