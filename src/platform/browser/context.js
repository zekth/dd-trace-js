'use strict'

module.exports = config => {
  return {
    get () {},
    set () {},
    run (fn) {
      fn()
    },
    bind (fn) {
      return fn
    },
    bindEmitter () {}
  }
}
