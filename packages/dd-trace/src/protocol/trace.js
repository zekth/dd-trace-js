'use strict'

const ProtocolBase = require('./base')

const utils = require('./utils')

class Trace extends ProtocolBase {
  constructor (traceId) {
    super(Trace.BYTE_LENGTH, 0xdd01)
    this.id = traceId || utils.id()
  }
}

Trace._makeAccessors({
  id: 'BigUint64'
})

module.exports = Trace
