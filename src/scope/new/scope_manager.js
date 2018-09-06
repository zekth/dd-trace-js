'use strict'

const asyncHooks = require('../async_hooks')
const Scope = require('./scope')
const Namespace = require('./namespace')

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

    this._stack = []
    this._contexts = new Map()
    this._ns = new Namespace()
    this._scopes = new Map()
    this._experimental = true

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
   * Get the current active scope or null if there is none.
   *
   * @returns {Scope} The active scope.
   */
  active () {
    const context = this._ns.active()
    return context ? context.scope : null
  }

  /**
   * Activate a new scope wrapping the provided span.
   *
   * @param {external:"opentracing.Span"} span The span for which to activate the new scope.
   * @param {?Boolean} [finishSpanOnClose=false] Whether to automatically finish the span when the scope is closed.
   * @returns {Scope} The newly created and now active scope.
   */
  activate (span, finishSpanOnClose) {
    const context = this._ns.create()

    if (span) {
      const scopes = this._scopes.get(this._currentId)

      context.scope = new Scope(span, this._ns, context, finishSpanOnClose)

      if (scopes) {
        scopes.push(context.scope)
      } else {
        this._scopes.set(this._currentId, [context.scope])
      }
    }

    this._ns.enter(context)

    return context.scope
  }

  _init (asyncId) {
    const context = this._ns.active()

    if (context) {
      this._contexts.set(asyncId, context)
    }
  }

  _before (asyncId) {
    const context = this._contexts.get(asyncId)

    if (context) {
      this._ns.enter(context)
    }

    this._currentId = asyncId
    this._stack.push(asyncId)
  }

  _after (asyncId) {
    const context = this._contexts.get(asyncId)

    if (context) {
      this._ns.exit(context)
    }

    if (this._currentId === asyncId) {
      this._currentId = this._stack.pop()
    }

    const scopes = this._scopes.get(asyncId)

    if (scopes) {
      for (let i = 0, l = scopes.length; i < l; i++) {
        scopes[i].close()
      }

      this._scopes.clear()
    }
  }

  _destroy (asyncId) {
    const context = this._contexts.get(asyncId)

    if (context) {
      this._contexts.delete(asyncId)
    }

    this._scopes.delete(asyncId)
  }

  _enable () {
    this._hook.enable()
  }

  _disable () {
    this._hook.disable()
  }
}

module.exports = ScopeManager
