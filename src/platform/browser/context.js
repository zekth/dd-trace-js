'use strict'

const context = new Map()

module.exports = config => {
  return {
    get (...args) {
      return context.get(...args)
    },
    set (...args) {
      return context.set(...args)
    },
    run (fn) {
      fn()
    },
    bind (fn) {
      return fn
    },
    bindEmitter () {}
  }
}
