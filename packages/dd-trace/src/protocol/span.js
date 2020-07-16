'use strict'

const ProtocolBase = require('./base')
const utils = require('./utils')

function now () {
  return process.hrtime.bigint()
}

class Span extends ProtocolBase {
  constructor ({ trace, parent, spanId }) {
    super(Span.BYTE_LENGTH, 0xdd02)
    this.traceId = trace.id
    if (parent) this.parentId = parent.id
    this.id = spanId || utils.id()
    this.start = BigInt(Date.now()) * 1000n
    this._start = now()
  }

  finish () {
    this.duration = now() - this._start
  }
}

Span._makeAccessors({
  id: 'BigUint64',
  parentId: 'BigUint64',
  traceId: 'BigUint64',
  start: 'BigUint64',
  duration: 'BigUint64',
  name: 'string',
  type: 'string',
  resource: 'string',
  service: 'string',
  error: 'bool'
})

module.exports = Span
