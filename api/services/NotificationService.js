/* eslint-disable no-undef */

module.exports = {
  /**
   * Create a `Notification` with `content` to `user`
   * @param {User} user
   * @param {Object} content
   * @param {Function} cb
   */
  notify (toUser, content, currentUid) {
    const { type, aboutComment, pageURL, pageTitle } = content

    const data = {
      type,
      pageURL,
      pageTitle,
      aboutComment,
      toUser,
    }
    return new Promise((resolve, reject) => {
      // if anonymous user or current user, skip
      if (!toUser || (currentUid && toUser === currentUid)) return resolve(null)
      Notification.create(data)
        .then(notif => {
          return resolve(notif)
        })
        .catch(err => {
          return reject(err)
        })
    })
  },
  notifyMultiple (toUsers, content, currentUid) {
    const { type, aboutComment, pageURL, pageTitle } = content

    // if anonymous user or current user, skip
    const data = toUsers.filter(toUser => (toUser || (currentUid && toUser && toUser !== currentUid))).map(toUser => ({
      type,
      pageURL,
      pageTitle,
      aboutComment,
      toUser,
    }))
    return new Promise((resolve, reject) => {
      if (toUsers.length === 0) return resolve([])
      Notification.create(data)
        .then(notifs => {
          return resolve(notifs)
        })
        .catch(err => {
          return reject(err)
        })
    })
  },
  handleMention (emails, content) {
    return new Promise((resolve, reject) => {
      UserService.getUsersByEmails(emails)
        .then(users => {
          const toUsers = users.filter(user => !!user).map(user => user.id)
          NotificationService.notifyMultiple(toUsers, content)
            .then(notifs => resolve(notifs))
            .catch(err => reject(err))
        })
    })
  },
  handlePostCommentNotifications (comment, currentUid) {
    const { id: aboutComment, pageURL, pageTitle, rootComment, parentComment, content } = comment

    const mentions = content.match(new RegExp('\\[@([^\\[\\]]+)\\]\\([^\\(\\)]+\\)', 'g')) || []
    let mentionedEmails = mentions.map(mention => mention.slice(mention.indexOf('(') + 1, -1))

    const baseNotif = { pageURL, pageTitle, aboutComment }
    const mentionNotif = { type: 'm', pageURL, pageTitle, aboutComment }

    return new Promise((resolve, reject) => {
      NotificationService.notify('admin', { type: !parentComment ? 'c' : (rootComment === parentComment) ? 'r' : 'd', ...baseNotif })
        .then(notifToAdmin => {
          if (!parentComment) {
            NotificationService.handleMention(mentionedEmails, mentionNotif, currentUid)
              .then(notifsToMentionedUsers => resolve({ notifToAdmin, notifsToMentionedUsers }))
              .catch(err => reject(err))
          } else {
            UserService.getCommentAuthor(parentComment)
              .then(parentCommentAuthor => {
                UserService.getCommentAuthor(rootComment)
                  .then(rootCommentAuthor => {
                    if (parentCommentAuthor === rootCommentAuthor) {
                      if (parentCommentAuthor) {
                        let type = 'r'
                        const idx = mentionedEmails.indexOf(parentCommentAuthor.email)
                        if (idx !== -1) {
                          type = 'rm'
                          metionedEmails.splice(idx, 1)
                        }
                        NotificationService.notify(parentCommentAuthor.id, { type, ...baseNotif }, currentUid)
                          .then(notifToParentCommentAuthor => {
                            NotificationService.handleMention(mentionedEmails, mentionNotif, currentUid)
                              .then(notifsToMentionedUsers => resolve({ notifToAdmin, notifToParentCommentAuthor, notifsToMentionedUsers }))
                              .catch(err => reject(err))
                          })
                          .catch(err => reject(err))
                      }
                    } else {
                      if (parentCommentAuthor) {
                        let type = 'r'
                        const idx = mentionedEmails.indexOf(parentCommentAuthor.email)
                        if (idx !== -1) {
                          type = 'rm'
                          metionedEmails.splice(idx, 1)
                        }
                        NotificationService.notify(parentCommentAuthor.id, { type, ...baseNotif }, currentUid)
                          .then(notifToParentCommentAuthor => {
                            if (rootCommentAuthor) {
                              let type = 'd'
                              const idx = mentionedEmails.indexOf(parentCommentAuthor.email)
                              if (idx !== -1) {
                                type = 'dm'
                                metionedEmails.splice(idx, 1)
                              }
                              NotificationService.notify(rootCommentAuthor.id, { type, ...baseNotif }, currentUid).then(notifToRootCommentAuthor => {
                                NotificationService.handleMention(mentionedEmails, mentionNotif, currentUid)
                                  .then(notifsToMentionedUsers => resolve({ notifToAdmin, notifToParentCommentAuthor, notifToRootCommentAuthor, notifsToMentionedUsers }))
                                  .catch(err => reject(err))
                              }).catch(err => reject(err))
                            } else {
                              NotificationService.handleMention(mentionedEmails, mentionNotif, currentUid)
                                .then(notifsToMentionedUsers => resolve({ notifToAdmin, notifToParentCommentAuthor, notifsToMentionedUsers }))
                                .catch(err => reject(err))
                            }
                          })
                          .catch(err => reject(err))
                      } else {
                        if (rootCommentAuthor) {
                          let type = 'd'
                          const idx = mentionedEmails.indexOf(parentCommentAuthor.email)
                          if (idx !== -1) {
                            type = 'dm'
                            metionedEmails.splice(idx, 1)
                          }
                          NotificationService.notify(rootCommentAuthor.id, { type, ...baseNotif }, currentUid).then(notifToRootCommentAuthor => {
                            NotificationService.handleMention(mentionedEmails, mentionNotif, currentUid)
                              .then(notifsToMentionedUsers => resolve({ notifToAdmin, notifToParentCommentAuthor, notifToRootCommentAuthor, notifsToMentionedUsers }))
                              .catch(err => reject(err))
                          }).catch(err => reject(err))
                        } else {
                          NotificationService.handleMention(mentionedEmails, mentionNotif, currentUid)
                            .then(notifsToMentionedUsers => resolve({ notifToAdmin, notifToParentCommentAuthor, notifsToMentionedUsers }))
                            .catch(err => reject(err))
                        }
                      }
                    }
                  })
                  .catch(err => reject(err))
              })
              .catch(err => reject(err))
          }
        })
        .catch(err => reject(err))
    })
  },
  broadcastNew (roomname, notif) {
    Comment.findOne({ id: notif.aboutComment })
      .populate('byUser')
      .then(comment => {
        notif.aboutComment = comment
        sails.sockets.broadcast(roomname, 'new-notification', { data: notif })
      })
      .catch(err => console.log(err))
  },
}
