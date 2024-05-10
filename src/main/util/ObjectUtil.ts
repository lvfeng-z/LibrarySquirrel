function nonUndefinedValue(obj: object | undefined): object {
  if (obj === undefined) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(obj).filter((keyValue) => {
      return keyValue[1] !== undefined
    })
  )
}

export default {
  nonUndefinedValue
}
