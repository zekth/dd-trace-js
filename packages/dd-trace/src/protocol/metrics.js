'use strict'

const strings = require('./strings')

const utils = require('./utils')

class Metrics extends DataView {
  constructor () {
    const offset = utils.alloc(Metrics.BYTE_LENGTH)
    super(utils.bufferPool, offset, Metrics.BYTE_LENGTH)
    this.setUint16(0, 0xdd04)
  }

  static get BYTE_LENGTH () {
    return (32 * 2 * 8) + 3
  }

  add (key, value) {
    const currentLen = this.getUint8(2)
    if (currentLen === 32) {
      throw new Error('too many metrics values')
    }

    this.setBigUint64(3 + (currentLen * 16), strings.get(key))
    this.setFloat64(3 + (currentLen * 16) + 8, value)
    this.setUint8(2, currentLen + 1)
  }

  getCurrentLen () {
    return this.getUint8(2)
  }

  [Symbol.for('nodejs.util.inspect.custom')] () {
    const obj = {}
    const len = this.getCurrentLen()
    for (let i = 0; i < len; i++) {
      obj[strings.revGet(this.getBigUint64(3 + (i * 16)))] =
        this.getFloat64(3 + (i * 16) + 8)
    }
    return obj
  }
}

module.exports = Metrics
