/**
 * NotificationController
 *
 * @description :: Server-side logic for managing notifications
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
/* eslint-disable no-undef */

module.exports = {
  notifications (req, res) {
    const toUser = req.session.userId
    Notification.find({ toUser })
      .sort('createdAt DESC')
      .then(notifs => {
        Comment.find({ id: notifs.map(notif => notif.aboutComment || 'removed') })
          .populate('byUser')
          .then(comments => {
            let commentDict = {}
            comments.forEach(comment => {
              commentDict[comment.id] = comment
            })
            notifs.forEach((notif, idx) => {
              if (notif.aboutComment) {
                notif.aboutComment = commentDict[notif.aboutComment]
              }
            })
            return res.json(200, { data: notifs })
          })
          .catch(err => res.json(200, { error: err }))
      })
      .catch(err => res.json(200, { error: err }))
  },
  deleteNotification (req, res) {
    const id = req.param('id')
    Notification.destroy({ id })
      .then(notif => res.json(200, { data: notif }))
      .catch(err => res.json(200, { error: err }))
  },
  toggleIsRead (req, res) {
    const id = req.param('id')
    console.log(id)
    Notification.findOne({ id })
      .then(notif => {
        console.log(notif)
        if (!notif) return res.json(200, { error: new Error('Notification not found.') })
        Notification.update({ id }, { isRead: !notif.isRead })
          .then(notif => res.json(200, { data: notif }))
          .catch(err => res.json(200, { error: err }))
      })
  },
}
