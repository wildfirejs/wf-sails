/**
 * BanController
 *
 * @description :: Server-side logic for managing bans
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
/* eslint-disable no-undef */

module.exports = {
  getAllBan (req, res) {
    Ban.find().sort('createdAt DESC').then(bans => res.json(200, { data: bans })).catch(error => res.json(200, { error }))
  },
  ban (req, res) {
    // `user` here should be either email or IP
    const user = req.param('user')
    Ban.findOne({ id: user }).then(ban => {
      if (ban) return res.json(200, { error: 'ban/duplicate_ban' })

      Ban.create({ id: user }).then(ban => {
        sails.sockets.broadcast('admin', `new-ban`, { data: ban })
        sails.sockets.broadcast(ban.id, `ban-state-change`, { data: ban })
        return res.json(200, { data: ban })
      }).catch(error => res.json(200, { error }))
    }).catch(error => res.json(200, { error }))
  },
  deleteBan (req, res) {
    const id = req.param('id')
    Ban.destroy({ id }).then(ban => {
      sails.sockets.broadcast('admin', `delete-ban`, { data: ban })
      sails.sockets.broadcast(ban.id, `ban-state-change`, { data: null })
      return res.json(200, { data: ban })
    }).catch(error => res.json(200, { error }))
  },
}
