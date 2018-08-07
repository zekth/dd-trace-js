'use strict'

class Context {
  constructor (type) {
    this._parent = null
    this._count = 0
    this._type = type
  }

  retain () {
    this._count++
  }

  release () {
    this._count--

    if (this._count === 0) {
      this._destroy()
    }
  }

  type () {
    return this._type
  }

  parent () {
    return this._parent
  }

  link (parent) {
    this.unlink()
    this._parent = parent
    this._parent.attach(this)
  }

  unlink () {
    if (this._parent) {
      this._parent.detach(this)
      this._parent = null
    }
  }

  _destroy () {
    this.unlink()
  }
}

module.exports = Context
