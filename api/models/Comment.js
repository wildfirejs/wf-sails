/**
 * Comment.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

const uuid = require('uuid')

module.exports = {
  attributes: {
    id: {
      type: 'string',
      primaryKey: true,
      defaultsTo: () => uuid.v4()
    },
    byUser: {
      model: 'user',
      via: 'comments'
    },
    content: {
      type: 'text',
      required: true
    },
    pageURL: {
      type: 'string'
    },

    ip: {
      type: 'string'
    },

    rootCommentOf: {
      collection: 'comment',
      via: 'rootComment'
    },
    parentCommentOf: {
      collection: 'comment',
      via: 'parentComment'
    },
    rootComment: {
      model: 'comment',
      via: 'rootCommentOf'
    },
    parentComment: {
      model: 'comment',
      via: 'parentCommentOf'
    },

    votes: {
      collection: 'vote',
      via: 'ofComment'
    },
    reports: {
      collection: 'report',
      via: 'ofComment'
    }
  }
}
