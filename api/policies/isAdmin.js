/**
 * isAdmin
 *
 * @module      :: Policy
 * @description :: Policy to check if current user is a admin user.
 *                 Should only be used after the policy `isSignedIn`.
 */
/* eslint-disable no-undef */

module.exports = (req, res, next) => {
  User.findOne({id: req.session.userId}).exec((err, user) => {
    if (err) return res.negotiate(err)
    if (!user) return res.json(404, 'auth/current_user_not_found')
    if (user.isAdmin) return next()

    return json(401, { error: 'auth/unauthorized' })
  })
}
