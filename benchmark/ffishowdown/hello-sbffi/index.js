const sharedStructs = require('shared-structs')
const { hello, setBuffer, setStringBuffer } = require('./build/Release/sbffi.node')

const callBufferSize = 1024 // 1k is big enough for this test
const stringBufferSize = 1024 // 1k is big enough for this test

const callBuffer = Buffer.alloc(callBufferSize)
const stringBuffer = Buffer.alloc(stringBufferSize)

setBuffer(callBuffer)
setStringBuffer(stringBuffer)

// `shared-structs` does not support pointers, so we'll use `uint64_t`, which is equivalent.
const structs = sharedStructs(`
struct thing {
  uint32_t num;
  uint64_t text;
}

struct thinglist {
  uint64_t things_len;
  uint64_t things;
}
`)

const thingSize = structs.thing().rawBuffer.length
const thinglistSize = structs.thinglist().rawBuffer.length

// Pre-initialize all the structs we'll ever need, since we know the layout of the buffer.
const tlist = structs.thinglist(callBuffer)
const things = []
const thingsLimit = Math.floor((callBufferSize - thinglistSize) / thingSize)
for (let i = 0; i < thingsLimit; i++) {
  things[i] = structs.thing(callBuffer, thinglistSize + (i * thingSize))
}

function doHello (list) {
  const len = list.length
  tlist.things_len = biginter(len)
  // We don't need to set the things pointer, since it's always set in the buffer;
  for (const i in list) {
    const item = list[i]
    const newThing = things[i]
    newThing.num = item.num
    newThing.text = getString(item.text) // We'll add the buffer pointer to this on the C side.
  }

  return hello()
}

module.exports = { hello: doHello }

const stringBufferCache = Object.create(null)
let stringBufferCursor = 0
function getString (str) {
  // This implementation assumes we'll never have more than 1k worth of
  // strings. Of course that's a bit preposterous, and this actually needs to
  // be implemented as an LRU cache, maybe with some protections against large
  // strings. (Maybe a ringbuffer?)
  let cached = stringBufferCache[str]
  if (cached) return cached
  cached = BigInt(stringBufferCursor)
  stringBufferCursor += stringBuffer.write(str, stringBufferCursor) + 1
  stringBufferCache[str] = cached
  return cached
}

const bigintCache = Array(callBufferSize).fill(null)
function biginter (num) {
  let result = bigintCache[num]
  if (result) return result
  result = BigInt(num)
  bigintCache[num] = result
  return result
}
