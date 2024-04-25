import { AbstractBaseDao } from './BaseDao'
import SiteTag from '../models/SiteTag'

export class SiteTagDaoTest extends AbstractBaseDao<SiteTag> {
  constructor() {
    super('site_tag')
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
