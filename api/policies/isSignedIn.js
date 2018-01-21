module.exports = (req, res, next) => {
  if (req.session.userId) return next()

  return res.json(401, { error: 'auth/unauthorized' })
}
