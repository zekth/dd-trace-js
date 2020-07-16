'use strict'

const oldId = require('../id')
const { randomBytes } = require('crypto')
const MAX_SIZE = 8 * 1024 * 1024

let idBuffer
let idCursor
function initIdBuffer () {
  const random = randomBytes(MAX_SIZE)
  idBuffer = new BigUint64Array(random.buffer, random.byteOffset, random.byteLength / 8)
  idCursor = 0
}
initIdBuffer()


exports.id = () => {
  if (idCursor === MAX_SIZE / 8) {
    initIdBuffer()
  }
  return idBuffer[idCursor++]
}

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
