'use strict'

const format = require('format-util')

const _default = console

let skipped = Object.create(null)
let timeouts = Object.create(null)

let _logger = _default
let _backoff = true

const log = {
  use (logger) {
    if (logger && typeof logger.debug === 'function' && typeof logger.error === 'function') {
      _logger = logger
    }

    return this
  },

  backoff (enabled) {
    _backoff = !!enabled

    return this
  },

  reset () {
    Object.keys(timeouts).forEach(key => {
      clearTimeout(timeouts[key])
    })

    _logger = _default
    _backoff = true

    skipped = Object.create(null)
    timeouts = Object.create(null)

    return this
  },

  debug (message, args) {
    return this._log('debug', message, args)
  },

  info (message, args) {
    return this._log(_logger.info ? 'info' : 'debug', message, args)
  },

  warn (message, args) {
    return this._log(_logger.warn ? 'warn' : 'error', message, args)
  },

  error (message, args) {
    return this._log('error', message, args)
  },

  _log (level, message, args) {
    if (this._filter(message)) {
      this._skip(message)
    } else {
      _logger[level](this._format(message, args))
    }

    return this
  },

  _format (message, args) {
    if (Array.isArray(message)) {
      message = message.join(' ')
    }

    if (_backoff && skipped[message] > 0) {
      message = `${message}, ${skipped[message]} additional messages skipped.`
    }

    if (args) {
      args = typeof args === 'function' ? args() : args
      message = format.bind(null, message).apply(null, args)
    }

    return message
  },

  _skip (message) {
    if (!skipped[message]) {
      skipped[message] = 0
    }

    skipped[message]++
  },

  _filter (message) {
    if (_backoff && timeouts[message]) return true

    timeouts[message] = setTimeout(() => this._timeout(message), 10 * 1000)
    timeouts[message].unref && timeouts[message].unref()

    return false
  },

  _timeout (message) {
    timeouts[message] = null
  }
}

module.exports = log
