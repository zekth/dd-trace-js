'use strict'

/**
 * The Datadog Scope. This is the type returned by ns.activate().
 *
 * @hideconstructor
 */
class Scope {
  constructor (span, ns, context, parent, finishSpanOnClose) {
    this._span = span
    this._ns = ns
    this._context = context
    this._parent = parent
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
      this._context.parent && this._context.parent._release()
      this._context.parent = null
    }

    this._ns.exit(this._context)
  }

  _retain () {
    this._count++
  }

  _release () {
    this._count--
    this.close()
  }

  _finish () {
    if (this._finishSpanOnClose) {
      this._span.finish()
    }
  }
}

module.exports = Scope
