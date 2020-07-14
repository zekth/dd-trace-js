'use strict'

const crypto = require('crypto')
const LRUCache = require('mnemonist/lru-cache')

exports.updateQueue = []

let cache
let revCache

function init (max) {
  cache = new LRUCache(max)
  revCache = new LRUCache(max)
}
exports.init = init

function get (string) {
  let id = cache.get(string)
  if (id) return id
  id = hash(string)
  cache.set(string, id)
  revCache.set(id, string)
  return id
}
exports.get = get

function revGet (id) {
  return revCache.get(id.toString())
}
exports.revGet = revGet

function revSet (id, string) {
  revCache.set(id.toString(), string)
}
exports.revSet = revSet

function hash (string) {
  const h = crypto.createHash('sha1')
  h.update(string)
  const id = h.digest().readBigUInt64BE()
  exports.updateQueue.push(new StringData(string, id))
  return id
}

function StringData (string, id) {
  const len = Buffer.byteLength(string)
  const arrayBuf = new ArrayBuffer(len + 14)
  const buf = new DataView(arrayBuf)
  buf.setUint16(0, 0xdd06) // object type
  buf.setBigUint64(2, id)
  buf.setUint32(10, len)
  // TODO use textencoder here?
  const datum = new Uint8Array(arrayBuf)
  datum.set(Buffer.from(string), 14)
  return datum
}

function flushQueue (writable) {
  for (const datum of exports.updateQueue) {
    writable.write(datum)
  }
  exports.updateQueue.length = 0
}
exports.flushQueue = flushQueue
