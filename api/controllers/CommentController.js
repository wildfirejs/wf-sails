/**
 * CommentController
 *
 * @description :: Server-side logic for managing comments
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
/* eslint-disable no-undef */

const _ = require('lodash')
const v = require('../utils/validation')
// const os = require('os')

// TODO: check isBanned
module.exports = {
  getComment (req, res) {
    const id = req.param('commentId')
    Comment.findOne({id})
      .populate('byUser')
      .exec((err, comment) => {
        if (err) return res.json(200, { error: 'server_error' })

        return res.json(200, { data: comment })
      })
  },
  comments (req, res) {
    const pageURL = req.param('pageURL')
    // TODO: encode pageURL
    if (!v.isString(pageURL)) {
      return res.json(200, { error: 'comment/invalid_page_url' })
    }
    Comment.find({ pageURL, parentComment: null })
      .populate('byUser')
      .populate('votes')
      .sort('createdAt DESC')
      .exec((err, comments) => {
        if (err) return res.json(200, { error: 'server_error' })

        sails.sockets.join(req, pageURL, (err) => {
          if (err) res.json(200, { error: 'server_error', _error: err })

          return res.json(200, { data: comments })
        })
      })
  },
  replies (req, res) {
    const commentId = req.param('commentId')
    if (!v.isString(commentId)) {
      return res.json(200, { error: 'comment/invalid_comment_id' })
    }
    Comment.find({rootComment: commentId})
      .populate('byUser')
      .populate('votes')
      .exec((err, replies) => {
        if (err) return res.json(200, { error: 'server_error', _error: err })

        return res.json(200, { data: replies })
      })
  },
  discussionCount (req, res) {
    const pageURL = req.param('pageURL')
    if (!v.isString(pageURL)) {
      return res.json(200, { error: 'comment/invalid_page_url' })
    }
    Comment.find({pageURL})
      .populate('rootCommentOf')
      .exec((err, comments) => {
        if (err) return res.json(200, { error: 'server_error', _error: err })
        let count = comments.length
        comments.forEach(comment => {
          count += comment.rootCommentOf.length
        })
        return res.json(200, { data: count })
      })
  },
  postComment (req, res) {
    const content = req.param('content')
    const pageURL = req.param('pageURL')
    const pageTitle = req.param('pageTitle')
    const rootComment = req.param('rootComment')
    const parentComment = req.param('parentComment')
    const byUser = req.session.userId
    const ip = req.ip || req.param('ip')
    if (!v.isString(content) || !v.isString(pageURL)) {
      return res.json(200, { error: 'invalid_params' })
    }

    User.findOne({id: byUser}, (err, user) => {
      if (err) return res.json(200, { error: 'server_error', _error: err })

      const data = {
        content,
        pageURL,
        pageTitle,
        byUser,
        ip,
        rootComment,
        parentComment,
      }
      // TODO: check if parentComment & rootComment exist
      Comment.create(data).exec((err, newComment) => {
        if (err) return res.json(200, { error: 'server_error', _error: err })

        newComment.byUser = user

        if (rootComment) {
          sails.sockets.blast(`new-reply-of-comment-${rootComment}`, {
            data: newComment,
          })
        } else {
          sails.sockets.blast(`new-comment-of-page-${pageURL}`, {
            data: newComment,
          })
        }

        NotificationService.handlePostCommentNotifications(newComment, byUser)
          .then(({ notifToAdmin, notifToParentCommentAuthor, notifToRootCommentAuthor, notifsToMentionedUsers }) => {
            if (notifToAdmin) {
              NotificationService.broadcastNew('admin', notifToAdmin)
            }
            if (notifToParentCommentAuthor) {
              NotificationService.broadcastNew(notifToParentCommentAuthor.toUser, notifToParentCommentAuthor)
            }
            if (notifToRootCommentAuthor) {
              NotificationService.broadcastNew(notifToRootCommentAuthor.toUser, notifToRootCommentAuthor)
            }
            notifsToMentionedUsers.forEach(notif => {
              NotificationService.broadcastNew(notif.toUser, notif)
            })
            return res.json(200, { data: newComment })
          })
          .catch(err => res.json(200, { error: err, data: newComment }))
      })
    })
  },
  deleteComment (req, res) {
    const id = req.param('commentId')
    const uid = req.session.userId
    Comment.findOne({id})
      .populate('reports')
      .populate('votes')
      .populate('rootCommentOf')
      .exec((err, comment) => {
        if (err) return res.json(200, { error: 'server_error', _error: err, pos: 0 })
        if (!comment) return res.json(200, { error: 'comment/no_longer_exist' })

        this._canCurrentUserDeleteComment(comment, uid, (err) => {
          if (err) return res.json(err.code, { error: err.msg })

          Comment.find({id: _.map(comment.rootCommentOf, 'id')}).populate('votes').populate('reports').exec((err, replies) => {
            if (err) return res.json(200, { error: 'server_error', _error: err, pos: 1 })

            const repliesVotes = replies.map(reply => _.map(reply.votes, 'id')).reduce((result, cur) => result.concat(cur), [])
            const repliesReports = replies.map(reply => _.map(reply.reports, 'id')).reduce((result, cur) => result.concat(cur), [])
            Promise.all([
              Vote.destroy({ id: [..._.map(comment.votes, 'id'), ...repliesVotes] }),
              Report.destroy({ id: [..._.map(comment.reports, 'id'), ...repliesReports] }),
              Comment.destroy({ id: [..._.map(replies, 'id'), id] }),
            ]).then(deletedRecords => {
              // TODO: broadcast `delete-report`
              const { rootComment, pageURL } = comment
              if (!rootComment) {
                sails.sockets.blast(`delete-comment-of-page-${pageURL}`, { data: comment })
              } else {
                sails.sockets.blast(`delete-reply-of-comment-${rootComment}`, { data: comment })
              }
              return res.json(200, { data: comment })
            }).catch(err => res.json(200, { error: 'server_error', _error: err, pos: 2 }))
          })
        })
      })
  },
  reportComment (req, res) {
    const id = req.param('commentId')
    const uid = req.session.userId
    const data = {
      ofComment: id,
      byUser: uid,
    }

    Comment.findOne({id}).then(comment => {
      if (!comment) return json(200, { error: 'comment/comment_not_found' })

      Report.findOne(data).then(report => {
        if (report) return res.json(200, { error: 'comment/duplicate_report' })

        Report.create(data).then(newReport => {
          if (!newReport) return res.json(200, { error: 'server_error' })
          Report.findOne(data).populate('byUser').populate('ofComment').then(report => {
            if (!report) return res.json(200, { error: 'server_error' })
            sails.sockets.broadcast('admin', `new-report`, { data: report })
            return res.json(200, { data: report })
          })
        })
      })
    }).catch(err => res.json(200, { error: 'server_error', _error: err }))
  },
  voteComment (req, res) {
    const id = req.param('commentId')
    const attitude = req.param('attitude')
    const uid = req.session.userId

    const data = {
      ofComment: id,
      byUser: uid,
    }
    Comment.findOne({id}).then(comment => {
      if (!comment) return res.json(200, { error: 'comment/comment_not_found' })

      Vote.findOne(data).then(vote => {
        if (vote) {
          if (attitude === undefined) {
            Vote.destroy(data).then((deletedVotes) => {
              let deletedVote = deletedVotes[0]
              deletedVote.attitude = undefined
              sails.sockets.blast(`vote-for-${id}`, { data: deletedVote })
              return res.json(200, { data: deletedVote })
            })
          } else {
            Vote.update(data, {attitude}).then((updatedVotes) => {
              const updatedVote = updatedVotes[0]
              sails.sockets.blast(`vote-for-${id}`, { data: updatedVote })
              return res.json(200, { data: updatedVote })
            })
          }
        } else {
          Vote.create(Object.assign(data, {attitude})).then((newVote) => {
            sails.sockets.blast(`vote-for-${id}`, { data: newVote })
            return res.json(200, { data: newVote })
          })
        }
      })
    }).catch(err => res.json(200, { error: 'server_error', _error: err }))
  },
  _canCurrentUserDeleteComment (comment, uid, cb) {
    const err401 = {
      code: 200,
      msg: {
        error: 'comment/unauthorized'
      }
    }
    const err404 = {
      code: 200,
      msg: {
        error: 'comment/current_user_not_found'
      }
    }

    if (comment.byUser === uid) return cb(null)

    User.findOne({id: uid}).then(user => {
      if (!user) {
        return cb(err404)
      }

      if (user.isAdmin) {
        return cb(null)
      }

      return cb(err401)
    }).catch((err) => {
      const err500 = {
        code: 200,
        msg: err
      }
      cb(err500)
    })
  }
}
