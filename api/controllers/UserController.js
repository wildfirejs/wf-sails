/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
/* eslint-disable no-undef */

const _ = require('lodash')
const v = require('../utils/validation')
const EmailAddresses = require('machinepack-emailaddresses')
const Passwords = require('machinepack-passwords')
const DEFAULT_AVATAR_URL = 'https://cdn.rawgit.com/cheng-kang/wildfire/088cf3de/resources/wildfire-avatar.svg'
const getDefaultDisplayName = (email) => email.split('@')[0]

module.exports = {
  signUp (req, res) {
    const email = req.param('email') || ''
    const password = req.param('password')

    if (!v.isString(password)(6)) {
      return res.json(200, { error: 'auth/invalid_password_empty' })
    }

    EmailAddresses.validate({ string: email }).exec({
      error: (err) => {
        return res.json(200, { error: 'server_error', _error: err })
      },
      invalid: () => {
        return res.json(200, { error: 'auth/invalid_email_format' })
      },
      success: () => {
        const displayName = getDefaultDisplayName(email)
        const avatarURL = req.param('avatarURL') || DEFAULT_AVATAR_URL
        const data = {
          email,
          password,
          displayName,
          avatarURL,
          isAdmin: false,
        }
        User.create(data).exec((err, newUser) => {
          if (err) {
            // Check for duplicate email address
            if (err.invalidAttributes && err.invalidAttributes.email && err.invalidAttributes.email[0] && err.invalidAttributes.email[0].rule === 'unique') {
              return res.json(409, { error: 'auth/duplicate_email' })
            }

            return res.json(200, { error: 'server_error', _error: err })
          }

          req.session.userId = newUser.id

          sails.sockets.broadcast(sails.sockets.getId(req), `auth-state-change`, { data: newUser })

          return res.json(200, { data: newUser })
        })
      },
    })
  },
  signIn (req, res) {
    const email = req.param('email')
    const password = req.param('password')
    User.findOne({email}).exec((err, user) => {
      if (err) return res.json(200, { error: 'server_error', _error: err })
      if (!user) return res.json(200, {error: 'auth/user_not_found'})

      Passwords.checkPassword({
        passwordAttempt: password,
        encryptedPassword: user.password,
      }).exec({
        error: err => res.json(200, { error: 'server_error', _error: err }),
        incorrect: () => res.json(200, 'auth/wrong_password'),
        success: () => {
          req.session.userId = user.id

          sails.sockets.join(req, req.ip)
          sails.sockets.join(req, user.id)
          sails.sockets.join(req, user.email)
          if (user.isAdmin) sails.sockets.join(req, 'admin')

          Ban.findOne({ id: user.email }).then(ban => {
            sails.sockets.broadcast(sails.sockets.getId(req), `auth-state-change`, { data: { user, isBanned: !!ban } })
            return res.json(200, { data: { user, isBanned: !!ban } })
          }).catch(error => res.json(500, { error }))
        },
      })
    })
  },
  signOut (req, res) {
    const id = req.session.userId
    User.findOne({id}, (err, user) => {
      if (err) return res.json(200, { error: 'server_error', _error: err })

      req.session.userId = null

      sails.sockets.leave(req, req.ip)
      sails.sockets.leave(req, user.id)
      sails.sockets.leave(req, user.email)
      if (user.isAdmin) sails.sockets.leave(req, 'admin')

      Ban.findOne({ id: req.ip }).then(ban => {
        sails.sockets.broadcast(sails.sockets.getId(req), `auth-state-change`, { data: { user: null, isBanned: !!ban } })
        return res.json(200, { data: { user: null, isBanned: !!ban } })
      })
    })
  },
  updateProfile (req, res) {
    const id = req.session.userId
    const displayName = req.param('displayName')
    const avatarURL = req.param('avatarURL')
    User.findOne({id}, (err, user) => {
      if (err) return res.json(200, { error: 'server_error', _error: err })

      User.update({id}, { displayName, avatarURL }, (err, updatedUsers) => {
        if (err) return res.json(200, { error: 'server_error', _error: err })

        return res.json(200, { data: updatedUsers[0] })
      })
    })
  },
  validatePassword (req, res) {
    const id = req.session.userId
    const password = req.param('password')
    User.findOne({id}).exec((err, user) => {
      if (err) return res.json(200, { error: 'server_error', _error: err })
      if (!user) return res.json(200, { error: 'auth/user_not_found' })

      Passwords.checkPassword({
        passwordAttempt: password,
        encryptedPassword: user.password,
      }).exec({
        error: err => res.json(200, { error: 'server_error', _error: err }),
        incorrect: () => res.json(200, { error: 'auth/wrong_password' }),
        success: () => {
          return res.json(200, { data: user })
        },
      })
    })
  },
  updatePassword (req, res) {
    const id = req.session.userId
    const password = req.param('password')
    if (!v.isString(password)(6)) {
      return res.json(200, { error: 'auth/invalid_password' })
    }
    User.findOne({id}, (err, user) => {
      if (err) return res.json(200, { error: 'server_error', _error: err })

      Passwords.encryptPassword({
        password: password,
      }).exec({
        error: (err) => res.json(200, { error: 'server_error', _error: err }),
        success: (result) => {
          User.update({id}, { password: result }, (err, updatedUsers) => {
            if (err) return res.json(200, { error: 'server_error', _error: err })

            return res.json(200, { data: updatedUsers[0] })
          })
        },
      })
    })
  },
  currentUser (req, res) {
    if (req.ip) {
      sails.sockets.join(req, req.ip)
    }

    const id = req.session.userId
    Ban.findOne({ id: req.ip || 'no req.ip' }).then(ban => {
      User.findOne({ id }).then(user => {
        if (user) {
          sails.sockets.join(req, user.id)
          sails.sockets.join(req, user.email)
          if (user.isAdmin) sails.sockets.join(req, 'admin')

          Ban.findOne({ id: user.email }).then(ban => {
            return res.json(200, { data: { user, isBanned: !!ban } })
          })
        } else {
          return res.json(200, { data: { user: null, isBanned: !!ban } })
        }
      }).catch(error => res.json(500, { error }))
    }).catch(error => res.json(500, { error }))
  },
  user (req, res) {
    const id = req.param('id')
    const email = req.param('email')
    // TODO: determine whether to use 200 or 200 here
    if (!id && !email) return res.json(200, { data: null })
    const criteria = {}
    if (id) { criteria.id = id }
    if (email) { criteria.email = email }
    User.findOne(criteria, (err, user) => {
      if (err) return res.json(200, { error: 'server_error', _error: err })

      return res.json(200, { data: user })
    })
  },
  allUsers (req, res) {
    User.find((err, users) => {
      if (err) return res.json(200, { error: 'server_error', _error: err })

      return res.json(200, { data: users })
    })
  },
}
