function isBlank(input: string) {
  return !input || /^\s*$/.test(input)
}

function isNotBlank(input: string) {
  return !isBlank(input)
}

export default {
  isBlank,
  isNotBlank
}
