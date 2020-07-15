'use strict'

const Metas = require('./metas')
const Metrics = require('./metrics')

const utils = require('./utils')
const strings = require('./strings')

function sizeOf (type) {
  return Number(type.replace(/.*nt/, '')) / 8
}

class ProtocolBase extends DataView {
  constructor (byteLength, magic) {
    const offset = utils.alloc(byteLength)
    super(utils.bufferPool, offset, byteLength)
    this.setUint16(0, magic)
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

  [Symbol.for('nodejs.util.inspect.custom')] () {
    const obj = {}
    for (const key in this) {
      obj[key] = this[key]
    }
    return obj
  }

  static _makeAccessors (accessorList) {
    let offset = 2 // magic number fits here
    for (const key in accessorList) {
      const valType = accessorList[key]
      const valOffset = offset
      if (valType === 'string') {
        Object.defineProperty(this.prototype, key, {
          get () {
            return strings.revGet(this.getBigUint64(valOffset))
          },
          set (val) {
            this.setBigUint64(valOffset, strings.get(val))
          },
          enumerable: true,
          configurable: true
        })
        offset += 8
      } else if (valType === 'bool') {
        Object.defineProperty(this.prototype, key, {
          get () {
            return !!this.getUint8(valOffset)
          },
          set (val) {
            this.setUint8(valOffset, val ? 1 : 0)
          },
          enumerable: true,
          configurable: true
        })
        offset += 1
      } else {
        const getterName = 'get' + valType
        const setterName = 'set' + valType
        Object.defineProperty(this.prototype, key, {
          get () {
            return this[getterName](valOffset)
          },
          set (val) {
            this[setterName](valOffset, val)
          },
          enumerable: true,
          configurable: true
        })
        offset += sizeOf(valType)
      }
      if (
        (this.constructor.name === 'Trace' && key === 'id') ||
        key === 'traceId'
      ) {
        offset += 8 // traceId is double-sized, to account for future 128-bit IDs
      }
    }

    Object.defineProperty(this, 'BYTE_LENGTH', { value: offset })
  }
}

module.exports = ProtocolBase
