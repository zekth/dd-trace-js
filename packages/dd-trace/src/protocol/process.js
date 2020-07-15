'use strict'

const Metas = require('./metas')
const Metrics = require('./metrics')

const utils = require('./utils')
const util = require('util')

class Process extends DataView {
  constructor () {
    const offset = utils.alloc(Process.BYTE_LENGTH)
    super(utils.bufferPool, offset, Process.BYTE_LENGTH)
    this.setUint16(0, 0xdd00) // object type
    this.setUint32(2, 0x00000001) // protocol version
    this.setBigUint64(6, 1024n) // string cache size
  }

  static get BYTE_LENGTH () {
    return 14
  }

  getId () {
    return 0n
  }

  addMetric (key, value) {
    if (!this.metrics) {
      this.metrics = new Metrics()
    }
    this.metrics.add(key, value)
  }

  addMeta (key, value) {
    if (!this.metas) {
      this.metas = new Metas()
    }
    this.metas.add(key, value)
  }

  [util.inspect.custom] () {
    const obj = {
      protocol_version: this.getUint32(2),
      string_cache_size: this.getBigUint64(6)
    }

    if (this.meta) {
      obj.meta = this.meta
    }

    if (this.metrics) {
      obj.metrics = this.metrics
    }

    return obj
  }
}

module.exports = Process
