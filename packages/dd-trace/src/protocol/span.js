'use strict'

const Metas = require('./metas')
const Metrics = require('./metrics')
const strings = require('./strings')

const utils = require('./utils')
const util = require('util')

class Span extends DataView {
  constructor ({ trace, parent, spanId }) {
    const offset = utils.alloc(Span.BYTE_LENGTH)
    super(utils.bufferPool, offset, Span.BYTE_LENGTH)
    this.setUint16(0, 0xdd02) // object type
    this.setTraceId(trace.getId())
    if (parent) this.setParentId(parent.getId())
    this.setId(spanId || utils.id())
  }

  static get BYTE_LENGTH () {
    return 83
  }

  setId (id) {
    this.setBigUint64(2, id)
  }

  getId () {
    return this.getBigUint64(2)
  }

  setParentId (id) {
    this.setBigUint64(10, id)
  }

  getParentId () {
    return this.getBigUint64(10)
  }

  setTraceId (id) {
    this.setBigUint64(18, id)
  }

  getTraceId () {
    return this.getBigUint64(18)
  }

  setStart (time) {
    this.setBigUint64(34, time)
  }

  getStart () {
    return this.getBigUint64(34)
  }

  setDuration (time) {
    this.setBigUint64(42, time)
  }

  getDuration () {
    return this.getBigUint64(42)
  }

  setName (name) {
    this.setBigUint64(50, strings.get(name))
  }

  getName () {
    return strings.revGet(this.getBigUint64(50))
  }

  setType (type) {
    this.setBigUint64(58, strings.get(type))
  }

  getType () {
    return strings.revGet(this.getBigUint64(58))
  }

  setResource (resource) {
    this.setBigUint64(66, strings.get(resource))
  }

  getResource () {
    return strings.revGet(this.getBigUint64(66))
  }

  setService (service) {
    this.setBigUint64(74, strings.get(service))
  }

  getService () {
    return strings.revGet(this.getBigUint64(74))
  }

  setError (isError) {
    this.setUint8(82, isError ? 1 : 0)
  }

  getError () {
    return !!this.getUint8(82)
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
      span_id: this.getId(),
      trace_id: this.getTraceId(),
      parent_id: this.getParentId(),
      start: this.getStart(),
      duration: this.getDuration(),
      name: this.getName(),
      type: this.getType(),
      resource: this.getResource(),
      service: this.getService(),
      error: this.getError()
    }

    if (this.metas) {
      obj.metas = this.metas
    }

    if (this.metrics) {
      obj.metrics = this.metrics
    }

    return obj
  }
}

module.exports = Span
