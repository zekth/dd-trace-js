const ffi = require('ffi-napi');
const ref = require('ref-napi');
const StructType = require('ref-struct-di')(ref)
const ArrayType = require('ref-array-di')(ref)
const path = require('path');
const libfile = path.join(__dirname, '..', 'hello', 'libhello.dylib');

const thing = StructType({
  num: ref.types.uint32,
  text: ref.types.CString
});

const thingarray = ArrayType(thing);

const thinglist = StructType({
  things_len: ref.types.size_t,
  things: thingarray
});

const hello = ffi.Library(libfile, {
  'hello': ['uint32', [ref.refType(thinglist)]]
});

function doHello(list) {
  const theThings = new thingarray(list.length);
  list.forEach((item, i) => {
    theThings[i] = new thing(item);
  });
  const theList = new thinglist({
    things_len: theThings.length,
    things: theThings
  });
  const listPointer = theList.ref();
  return hello.hello(listPointer);
}

module.exports = { hello: doHello };
