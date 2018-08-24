'use strict'

const asyncHooks = require('../async_hooks')
const Scope = require('./scope')
const Link = require('./link')
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

    this._link = null
    this._contexts = new Map()
    this._links = new Map()
    this._ns = new Namespace()

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
    // const context = this._ns.active()
    return null
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
    // const context = Object.prototype

    context.scope = new Scope(span, this._ns, context, this._link, finishSpanOnClose)

    this._ns.enter(context)

    return context.scope
  }

  _init (asyncId) {
    // const link = new Link(this._link)

    // link.retain()

    // this._links.set(asyncId, link)

    const active = this._ns.active()

    if (active) {
      this._contexts.set(asyncId, this._ns.active())
    }
  }

  _before (asyncId) {
    const context = this._contexts.get(asyncId)

    if (context) {
      this._ns.enter(context)
    }

    // this._link = this._links.get(asyncId)
  }

  _after (asyncId) {
    const context = this._contexts.get(asyncId)

    if (context) {
      this._ns.exit(context)
    }

    // if (this._link) {
    //   this._link.close()
    //   this._link = this._link.parent()
    // }
  }

  _destroy (asyncId) {
    // const link = this._links.get(asyncId)

    // if (link) {
    //   link.release()
    // }

    this._contexts.delete(asyncId)
    // this._links.delete(asyncId)
  }

  _enable () {
    this._hook.enable()
  }

  _disable () {
    this._hook.disable()
  }
}

module.exports = ScopeManager
