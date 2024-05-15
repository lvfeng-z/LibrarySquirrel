import { SelectOption } from './SelectOption'

export interface CommonInputConfig {
  type:
    | 'default'
    | 'text'
    | 'date'
    | 'datetime'
    | 'number'
    | 'textarea'
    | 'checkbox'
    | 'radio'
    | 'select'
    | 'selectTree'
    | 'switch'
  defaultDisabled?: boolean
  dblclickEnable?: boolean
  selectData?: SelectOption[]
}
