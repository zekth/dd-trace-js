const crypto = require('crypto')
const fs = require("fs")
const loader = require("@assemblyscript/loader")
const wasmModule = loader.instantiateSync(fs.readFileSync(__dirname + "/random.wasm"), {});

const wasmResult = new Uint8Array(wasmModule.exports.memory.buffer);

const seedBuf = crypto.randomBytes(8);
wasmResult.set(seedBuf);

const POOL_SIZE = 4096 * 10
let pool = new ArrayBuffer(POOL_SIZE);
let poolId = 0

function getUint8Array() {
  const result = new Uint8Array(pool, poolId, 8);
  poolId += 8;
  if (poolId === POOL_SIZE) {
    pool = new ArrayBuffer(POOL_SIZE);
    poolId = 0;
  }
  return result;
}

function wasmRandom () {
  wasmModule.exports.random();
  const result = getUint8Array();
  result[0] = wasmResult[0];
  result[1] = wasmResult[1];
  result[2] = wasmResult[2];
  result[3] = wasmResult[3];
  result[4] = wasmResult[4];
  result[5] = wasmResult[5];
  result[6] = wasmResult[6];
  result[7] = wasmResult[7];
  return result;
}

module.exports = wasmRandom;
