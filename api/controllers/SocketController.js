/**
 * SocketController
 *
 * @description :: Server-side logic for managing sockets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
/* eslint-disable no-undef */
const { NEW_TOP_LEVEL_COMMENT, NEW_REPLY_OF_COMMENT } = require('../utils/sockets')

// TODO: custom responses
module.exports = {
  newTopLevelComment (req, res) {
    if (!req.isSocket) return res.json(400, { error: 'socket/request_is_not_socket' })

    const pageURL = req.param('pageURL')
    if (!pageURL) return res.json(404, { error: 'socket/page_not_found' })

    sails.sockets.join(req, NEW_TOP_LEVEL_COMMENT, (err) => {
      if (err) res.json(500, { error: 'socket/server_error' })

      return res.json({
        message: `Subscribed to '${NEW_TOP_LEVEL_COMMENT}'`
      })
    })
  },
  newReplyOfComment (req, res) {
    if (!req.isSocket) return res.badRequest()

    const commentId = req.param('commentId')
    if (!pageURL) return res.json(400, { error: 'socket/missing_commentId' })

    sails.sockets.join(req, NEW_REPLY_OF_COMMENT(commentId), (err) => {
      if (err) res.json(500, { error: 'socket/server_error' })

      return res.json({
        message: `Subscribed to '${NEW_REPLY_OF_COMMENT(commentId)}'`
      })
    })
  },
  discussionCountOfPage (req, res) {
    
  }
}
