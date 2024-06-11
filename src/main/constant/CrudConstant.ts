const SAVE_FAILED = 0

enum COMPARATOR {
  EQUAL = '=',
  NOT_EQUAL = '!=',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  LIKE = 'like',
  LEFT_LIKE = 'leftLike',
  RIGHT_LIKE = 'rightLike'
}

export { SAVE_FAILED, COMPARATOR }
