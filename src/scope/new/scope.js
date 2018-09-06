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
    this._finishSpanOnClose = !!finishSpanOnClose
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

    this._ns.exit(this._context)

    if (this._finishSpanOnClose) {
      this._span.finish()
    }

    this._closed = true
  }
}

module.exports = Scope
