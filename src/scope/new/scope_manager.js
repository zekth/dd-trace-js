'use strict'

const asyncHooks = require('../async_hooks')

let singleton = null

/**
 * The Datadog Scope Manager. This is used for context propagation.
 *
 * @hideconstructor
 */
class ScopeManager {
  constructor () {
    if (singleton) {
      return singleton
    }

    singleton = this

    this._active = null
    this._set = []
    this._spans = new Map()

    this._hook = asyncHooks.createHook({
      init: this._init.bind(this),
      before: this._before.bind(this),
      after: this._after.bind(this),
      destroy: this._destroy.bind(this),
      promiseResolve: this._destroy.bind(this)
    })

    this._enable()

    return this
  }

  /**
   * Get the current active span or null if there is none.
   *
   * @returns {Span} The active span.
   */
  active () {
    return this._active
  }

  /**
   * Activate a new span in the scope of the provided callback.
   *
   * @param {external:"opentracing.Span"} span The span to activate in the scope of the callback.
   * @param {Function} fn The callback for which to activate the span.
   * @returns The return value of the provided callback.
   */
  activate (span, fn) {
    this._enter(span)

    try {
      return fn(span)
    } finally {
      this._exit(span)
    }
  }

  _init (asyncId) {
    if (this._active) {
      this._spans.set(asyncId, this._active)
    }
  }

  _before (asyncId) {
    const span = this._spans.get(asyncId)

    if (span) {
      this._enter(span)
    }
  }

  _after (asyncId) {
    const span = this._spans.get(asyncId)

    if (span) {
      this._exit(span)
    }
  }

  _destroy (asyncId) {
    this._spans.delete(asyncId)
  }

  _enter (span) {
    this._set.push(this._active)
    this._active = span
  }

  _exit (span) {
    if (this._active === span) {
      this._active = this._set.pop()
      return
    }

    const index = this._set.lastIndexOf(span)

    if (index !== -1) {
      this._set.splice(index, 1)
    }
  }

  _enable () {
    this._hook.enable()
  }

  _disable () {
    this._hook.disable()
  }
}

module.exports = ScopeManager
