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
    | 'selectTree'
    | 'switch'
  defaultDisabled?: boolean
  dblclickEnable?: boolean
}
