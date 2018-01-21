module.exports = (req, res, next) => {
  if (!req.session.userId) return next()

  return res.json(400, { error: 'auth/already_authorized' })
}
