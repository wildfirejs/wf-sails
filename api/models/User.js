/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

const uuid = require('uuid')
const Passwords = require('machinepack-passwords')

module.exports = {
  attributes: {
    id: {
      type: 'string',
      primaryKey: true,
      defaultsTo: () => uuid.v4(),
    },
    email: {
      type: 'string',
      email: 'true',
      unique: 'true',
    },
    password: {
      type: 'string',
    },
    displayName: {
      type: 'string',
    },
    // Note: this field `avatarURL` is named `photoURL` in other database versions
    avatarURL: {
      type: 'string',
    },

    isAdmin: {
      type: 'boolean',
    },

    comments: {
      collection: 'comment',
      via: 'byUser',
    },
    votes: {
      collection: 'vote',
      via: 'byUser',
    },
    reports: {
      collection: 'report',
      via: 'byUser',
    },
    notifications: {
      collection: 'notification',
      via: 'toUser',
    },

    toJSON () {
      var obj = this.toObject()
      delete obj.password
      return obj
    },
  },
  beforeCreate (values, cb) {
    Passwords.encryptPassword({
      password: values.password,
    }).exec({
      error: (err) => {
        return cb(err)
      },
      success: (result) => {
        values.password = result
        cb()
      },
    })
  },
}
