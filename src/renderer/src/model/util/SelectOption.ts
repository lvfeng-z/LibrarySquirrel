interface SelectOption {
  value: string
  label: string
  secondaryLabel: string // 用于double-check-tag
  state?: boolean // 用于double-check-tag
  extraData?: object
}

export default SelectOption
