const _ = require('lodash')

module.exports = {
  /**
   * Validate a target variable to see if
   *  it is a string with a minimum length.
   *
   * @param target: the target to Validate
   * @param minLength(optional): the minimum length
   *
   * Example:
   *  const t = '123'
   *  isString(t)(6) // false
   */
  isString: target => (minLength = 1) => _.isString(target) && target.length >= minLength,
  isBoolean: target => _.isBoolean(target)
}
