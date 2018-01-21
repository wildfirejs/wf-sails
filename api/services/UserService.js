/* eslint-disable no-undef */

module.exports = {
  getCommentAuthor (commentId) {
    return new Promise((resolve, reject) => {
      Comment.findOne({ id: commentId })
        .populate('byUser')
        .then(comment => {
          if (!comment) return reject(new Error('Comment not found.'))
          return resolve(comment.byUser)
        })
        .catch(err => {
          return reject(err)
        })
    })
  },
  getUsersByEmails (emails) {
    return new Promise((resolve, reject) => {
      User.find({ email: emails })
        .then(users => resolve(users))
        .catch(err => reject(err))
    })
  },
}
