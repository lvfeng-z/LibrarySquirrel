import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO.js'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.js'
import LocalAuthorQueryDTO from '../model/queryDTO/LocalAuthorQueryDTO.js'
import SiteAuthorQueryDTO from '../model/queryDTO/SiteAuthorQueryDTO.js'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.js'

export type SearchTypes = LocalTagQueryDTO | SiteTagQueryDTO | LocalAuthorQueryDTO | SiteAuthorQueryDTO | SiteQueryDTO
