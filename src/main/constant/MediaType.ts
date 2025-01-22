export enum MediaType {
  PICTURE = 1,
  VIDEO = 2,
  DOCUMENT = 3,
  AUDIO = 4
}

export const MediaExtMapping = {
  [MediaType.PICTURE]: ['.jpg', '.png', '.jpeg', '.gif'],
  [MediaType.VIDEO]: ['.mp4', '.avi', '.mkv'],
  [MediaType.DOCUMENT]: ['.pdf', '.docx', '.doc', '.xlsx', '.txt'],
  [MediaType.AUDIO]: ['.mp3', '.wav', '.aac']
}
