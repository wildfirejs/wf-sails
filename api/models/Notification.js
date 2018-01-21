/**
 * Notification.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    toUser: {
      model: 'user',
      via: 'notifications',
      required: true,
    },
    aboutComment: {
      model: 'comment',
      required: true,
    },
    pageTitle: {
      type: 'string',
      required: true,
    },
    pageURL: {
      type: 'string',
      required: true,
    },
    type: {
      type: 'string',
      // value: ['c', 'r', 'd', 'm', 'rm', 'dm']
      required: true,
    },
    isRead: {
      type: 'boolean',
      defaultsTo: false,
    },
  },
}
