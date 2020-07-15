'use strict'

const oldId = require('../id')

exports.id = () => new BigUint64Array(oldId().toBuffer().buffer)[0]

const MAX_SIZE = 8 * 1024 * 1024
exports.bufferPool = new ArrayBuffer(MAX_SIZE)
let cursor = 0

function alloc (size) {
  if (cursor + size > MAX_SIZE) {
    exports.bufferPool = new ArrayBuffer(MAX_SIZE)
    cursor = 0
  }
  const oldCursor = cursor
  cursor = cursor + size
  return oldCursor
}
exports.alloc = alloc
