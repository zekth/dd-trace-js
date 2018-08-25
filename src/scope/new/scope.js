'use strict'

/**
 * The Datadog Scope. This is the type returned by ns.activate().
 *
 * @hideconstructor
 */
class Scope {
  constructor (span, ns, context, finishSpanOnClose) {
    this._span = span
    this._ns = ns
    this._context = context
    this._parent = this._context.prototype ? this._context.prototype.scope : null
    this._finishSpanOnClose = !!finishSpanOnClose
    this._count = 0

    ns.enter(context)

    if (this._parent) {
      this._parent._retain()
    }
  }

  /**
   * Get the span wrapped by this scope.
   *
   * @returns {Scope} The wrapped span.
   */
  span () {
    return this._span
  }

  /**
   * Close the scope, and finish the span if the scope was created with `finishSpanOnClose` set to true.
   */
  close () {
    if (this._closed) return

    if (this._count === 0) {
      this._finish()
      this._parent && this._parent._release()
      this._context.scopes.delete(this)
    }

    this._exit()
  }

  _retain () {
    this._count++
  }

  _release () {
    this._count--
    this.close()
  }

  _exit () {
    if (this._exited) return

    this._ns.exit(this._context)
    this._exited = true
  }

  _finish () {
    if (this._finishSpanOnClose) {
      this._span.finish()
    }
  }
}

module.exports = Scope
