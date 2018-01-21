/**
 * ReportController
 *
 * @description :: Server-side logic for managing reports
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
/* eslint-disable no-undef */

module.exports = {
  reports (req, res) {
    Report.find().sort('createdAt DESC')
      .then(reports => {
        const reportersDict = {}
        const reportsForUniqueComments = []
        reports.forEach(report => {
          if (reportersDict[report.id]) {
            reportersDict[report.id].push(report.byUser)
          } else {
            reportersDict[report.id] = [report.byUser]
            reportsForUniqueComments.push(report)
          }
        })
        Comment.find({ id: reportsForUniqueComments.map(report => report.ofComment) })
          .populate('byUser')
          .then(comments => {
            Promise.all(comments.map(comment => Comment.count({ rootComment: comment.id })))
              .then(repliesCounts => {
                let commentDict = {}
                let repliesCountDict = {}
                comments.forEach((comment, idx) => {
                  commentDict[comment.id] = comment
                  repliesCountDict[comment.id] = repliesCounts[idx]
                })
                reportsForUniqueComments.forEach((report, idx) => {
                  report.ofComment = commentDict[report.ofComment]
                  report.ofCommentRepliesCount = repliesCountDict[report.ofComment.id] || 0
                  report.reporters = reportersDict[report.id]
                })
                return res.json(200, { data: reports })
              })
              .catch(error => res.json(200, { error }))
          })
      })
      .catch(error => res.json(200, { error }))
  },
  deleteReport (req, res) {
    const id = req.param('id')
    Report.destroy({ id }).then(report => {
      sails.sockets.broadcast('admin', 'delete-report', { data: report })
      return res.json(200, { data: report })
    }).catch(error => res.json(200, { error }))
  },
}
