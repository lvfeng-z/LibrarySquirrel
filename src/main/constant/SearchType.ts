import LocalTagQueryDTO from '@shared/model/queryDTO/LocalTagQueryDTO.js'
import SiteTagQueryDTO from '@shared/model/queryDTO/SiteTagQueryDTO.js'
import LocalAuthorQueryDTO from '@shared/model/queryDTO/LocalAuthorQueryDTO.js'
import SiteAuthorQueryDTO from '@shared/model/queryDTO/SiteAuthorQueryDTO.js'
import SiteQueryDTO from '@shared/model/queryDTO/SiteQueryDTO.js'

export type SearchTypes = LocalTagQueryDTO | SiteTagQueryDTO | LocalAuthorQueryDTO | SiteAuthorQueryDTO | SiteQueryDTO
