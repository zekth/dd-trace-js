'use strict'

class Link {
  constructor (parent) {
    this._count = 0
    this._parent = parent
    this._spans = new Set()
    this._scopes = new Set()

    if (this._parent) {
      this._parent.retain()
    }
  }

  count () {
    return this._count
  }

  retain () {
    this._count++
  }

  release () {
    this._count--

    if (this._count === 0) {
      for (const span of this._spans) {
        span.finish()
      }

      this._parent && this._parent.release()
    }
  }

  parent () {
    return this._parent
  }

  hold (span) {
    this._spans.add(span)
  }

  add (scope) {
    this._scopes.add(scope)
  }

  remove (scope) {
    this._scopes.delete(scope)
  }

  close () {
    for (const scope of this._scopes) {
      scope.close()
    }

    this._scopes.clear()
  }
}

module.exports = Link
