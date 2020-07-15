'use strict'

const { Writable } = require('stream')

const Process = require('./process')
const Trace = require('./trace')
const Span = require('./span')
const Metrics = require('./metrics')
const Metas = require('./metas')

const strings = require('./strings')

function makeInstance (Type, typeName, decoder, buf) {
  if (buf.length < Type.BYTE_LENGTH) {
    return 0
  }
  const dv = new DataView(buf.buffer, buf.offset, Type.BYTE_LENGTH)
  Object.setPrototypeOf(dv, Type.prototype)
  if (decoder.seen[typeName]) {
    decoder.seen[typeName][dv.id.toString()] = dv
  }
  decoder.lastObject = dv
  return Type.BYTE_LENGTH
}

const objectTypes = [
  makeInstance.bind(null, Process, 'processes'),
  makeInstance.bind(null, Trace, 'traces'),
  makeInstance.bind(null, Span, 'spans'),
  function reserved () { return 0 },
  function metrics (decoder, buf) {
    const lastObj = decoder.lastObject
    const bytes = makeInstance(Metrics, 'metrics', decoder, buf)
    if (bytes) {
      lastObj.metrics = decoder.lastObject
      decoder.lastObject = lastObj
    }
    return bytes
  },
  function metas (decoder, buf) {
    const lastObj = decoder.lastObject
    const bytes = makeInstance(Metas, 'metas', decoder, buf)
    if (bytes) {
      lastObj.metas = decoder.lastObject
      decoder.lastObject = lastObj
    }
    return bytes
  },
  function string (_decoder, buf) {
    const id = buf.readBigUInt64BE(2)
    const strlen = buf.readUInt32BE(10)
    if (buf.length < strlen + 14) return 0
    const string = buf.slice(14, 14 + strlen).toString('utf8')
    strings.revSet(id, string)
    return strlen + 14
  }
]

class Decoder extends Writable {
  constructor () {
    super()
    this.buf = Buffer.alloc(0)
    this.seen = {
      processes: {},
      traces: {},
      spans: {},
      // metrics: {},
      // metas: {}
    }
  }

  _write (chunk, _encoding, cb) {
    this.buf = Buffer.concat([this.buf, chunk])
    let bytesRead = -1
    while (bytesRead !== 0) {
      bytesRead = this.tryParse()
    }
    cb()
  }

  tryParse () {
    if (this.buf.length === 0) return 0

    if (this.buf[0] !== 0xdd) {
      throw new Error('bad data: ' + require('util').inspect(this.buf))
    }

    if (this.buf[1] >= objectTypes.length) {
      throw new Error('bad data')
    }

    const bytesRead = objectTypes[this.buf[1]](this, this.buf)
    if (bytesRead === 0) return 0
    this.buf = this.buf.slice(bytesRead)
    return bytesRead
  }
}

module.exports = Decoder
