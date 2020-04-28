const sharedStructs = require('shared-structs');
const { hello, setBuffer } = require('./build/Release/sbffi.node');

const callBufferSize = 1024; // 1k is big enough for this test

const bigintCache = Array(callBufferSize).fill(null);

const callBuffer = Buffer.alloc(callBufferSize);

const callBufferPtr = setBuffer(callBuffer);

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
`);

const thingSize = structs.thing().rawBuffer.length;
const thinglistSize = structs.thinglist().rawBuffer.length;

{
  // Pre-set the things pointer, which never changes
  const thinglistPtr = callBufferPtr + biginter(thinglistSize);
  const tlist = structs.thinglist(callBuffer);
  tlist.things = thinglistPtr;
}

function doHello(list) {
  const len = list.length;
  let cursor = 0;
  const tlist = structs.thinglist(callBuffer);
  tlist.things_len = biginter(len);
  cursor += thinglistSize;
  // We don't need to set the things pointer, since it's always set in the buffer;
  let stringCursor = cursor + (len * thingSize);
  for (const item of list) {
    let newThing = structs.thing(callBuffer, cursor);
    newThing.num = item.num;
    newThing.text = callBufferPtr + biginter(stringCursor);
    cursor += thingSize;

    stringCursor += writeString(item.text, callBuffer, stringCursor);
  }

  return hello();
}

module.exports = { hello: doHello };

const stringBufferCache = Object.create(null);
function writeString(text, buffer, offset) {
  let cached = stringBufferCache[text];
  if (!cached) {
    cached = Buffer.from(text);
    stringBufferCache[text] = cached;
  }
  // Adding 1 to the result to account for the null terminator
  return cached.copy(buffer, offset) + 1;
}

function biginter (num) {
  let result = bigintCache[num];
  if (result) return result;
  result = BigInt(num);
  bigintCache[num] = result;
  return result;
}
