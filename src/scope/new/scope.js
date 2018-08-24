'use strict'

/**
 * The Datadog Scope. This is the type returned by ns.activate().
 *
 * @hideconstructor
 */
class Scope {
  constructor (span, ns, context, link, finishSpanOnClose) {
    this._span = span
    this._ns = ns
    this._context = context
    this._link = link
    this._finishSpanOnClose = !!finishSpanOnClose

    if (this._link) {
      this._link.add(this)
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
    if (this._link) {
      if (this._finishSpanOnClose) {
        // this._link.hold(this._span)
      }

      // this._link.remove(this)
    }

    if (this._context) {
      this._ns.exit(this._context)
    }
  }
}

module.exports = Scope
