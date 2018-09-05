'use strict'

class Namespace {
  constructor () {
    this._active = null
    this._set = []
  }

  create () {
    return {}
  }

  active () {
    return this._active
  }

  enter (context) {
    this._set.push(this._active)
    this._active = context
  }

  exit (context) {
    if (this._active === context) {
      this._active = this._set.pop()
      return
    }

    const index = this._set.lastIndexOf(context)

    if (index !== -1) {
      this._set.splice(index, 1)
    }
  }
}

module.exports = Namespace
