'use strict'

const ProtocolBase = require('./base')

class Process extends ProtocolBase {
  constructor () {
    super(Process.BYTE_LENGTH, 0xdd00)
    this.setUint32(2, 0x00000001) // protocol version
    this.setBigUint64(6, 1024n) // string cache size
  }

  get id () {
    return 0 // there can be only one
  }
}

Process._makeAccessors({
  protocolVersion: 'Uint32',
  stringCacheSize: 'BigUint64'
})

module.exports = Process
