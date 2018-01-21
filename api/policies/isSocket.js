module.exports = (req, res, next) => {
  if (req.isSocket) return next()

  return res.json(400, { error: 'request_not_via_socket' })
}
