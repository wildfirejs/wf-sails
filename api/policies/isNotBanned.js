/**
 * isNotBanned
 *
 * @module      :: Policy
 * @description :: Policy to check if current user is banned.
 */
/* eslint-disable no-undef */

module.exports = (req, res, next) => {
  const user = req.session.userId || req.ip
  Ban.findOne({ id: user }).then(ban => {
    if (ban) return res.json(401, 'auth/unauthorized')
    return next()
  }).catch(error => res.json(500, { error }))
}
