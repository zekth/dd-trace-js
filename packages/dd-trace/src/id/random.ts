// compile with:
// $ asc random.ts --target release --runtime none --memoryBase 64 -O3

export function random(): void {
  store<u64>(0, mathDotRandom() & 0x7FFFFFFFFFFFFFFF);
}

const seed = load<u64>(0);

let state0: u64 = murmurHash3(seed);
let state1: u64 = murmurHash3(~state0);

function murmurHash3(h: u64): u64 { // Force all bits of a hash block to avalanche
  h ^= h >> 33;                     // see: https://github.com/aappleby/smhasher
  h *= 0xFF51AFD7ED558CCD;
  h ^= h >> 33;
  h *= 0xC4CEB9FE1A85EC53;
  h ^= h >> 33;
  return h;
}

function mathDotRandom(): u64 { // see: v8/src/base/utils/random-number-generator.cc
  var s1 = state0;
  var s0 = state1;
  state0 = s0;
  s1 ^= s1 << 23;
  s1 ^= s1 >> 17;
  s1 ^= s0;
  s1 ^= s0 >> 26;
  state1 = s1;
  return s0 + s1;
}
