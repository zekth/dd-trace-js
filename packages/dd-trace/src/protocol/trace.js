'use strict'

const Metas = require('./metas')
const Metrics = require('./metrics')

const utils = require('./utils')
const util = require('util')

class Trace extends DataView {
  constructor (traceId) {
    const offset = utils.alloc(Trace.BYTE_LENGTH)
    super(utils.bufferPool, offset, Trace.BYTE_LENGTH)
    this.setUint16(0, 0xdd01) // object type
    this.setBigUint64(2, traceId || utils.id())
  }

  static get BYTE_LENGTH () {
    return 18
  }

  getId () {
    return this.getBigUint64(2)
  }

  setId (traceId) {
    this.setBigUint64(2, traceId)
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
      trace_id: this.getId()
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

module.exports = Trace
