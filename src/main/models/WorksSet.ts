/**
 * 作品集合
 */

export default class WorksSet {
  id: string
  setName: string
  siteId: number
  siteWorksId: string
  siteWorksName: string
  siteAuthorId: string
  siteUploadTime: string
  siteUpdateTime: string
  nickName: string
  localAuthor: number
  createTime: number
  constructor(
    id: string,
    setName: string,
    siteId: number,
    siteWorksId: string,
    siteWorksName: string,
    siteAuthorId: string,
    siteUploadTime: string,
    siteUpdateTime: string,
    nickName: string,
    localAuthor: number,
    createTime: number
  ) {
    this.id = id
    this.setName = setName
    this.siteId = siteId
    this.siteWorksId = siteWorksId
    this.siteWorksName = siteWorksName
    this.siteAuthorId = siteAuthorId
    this.siteUploadTime = siteUploadTime
    this.siteUpdateTime = siteUpdateTime
    this.nickName = nickName
    this.localAuthor = localAuthor
    this.createTime = createTime
  }
}
