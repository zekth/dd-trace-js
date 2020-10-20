(module
 (type $none_=>_none (func))
 (memory $0 1)
 (global $assembly/index/seed (mut i64) (i64.const 0))
 (global $assembly/index/state0 (mut i64) (i64.const 0))
 (global $assembly/index/state1 (mut i64) (i64.const 0))
 (export "memory" (memory $0))
 (export "random" (func $assembly/index/random))
 (start $~start)
 (func $assembly/index/random
  (local $0 i64)
  (local $1 i64)
  global.get $assembly/index/state0
  local.set $0
  global.get $assembly/index/state1
  local.tee $1
  global.set $assembly/index/state0
  local.get $1
  local.get $0
  local.get $0
  i64.const 23
  i64.shl
  i64.xor
  local.tee $0
  local.get $0
  i64.const 17
  i64.shr_u
  i64.xor
  i64.xor
  local.get $1
  i64.const 26
  i64.shr_u
  i64.xor
  local.tee $0
  global.set $assembly/index/state1
  i32.const 0
  local.get $0
  local.get $1
  i64.add
  i64.const 9223372036854775807
  i64.and
  i64.store
 )
 (func $~start
  (local $0 i64)
  i32.const 0
  i64.load
  global.set $assembly/index/seed
  global.get $assembly/index/seed
  local.tee $0
  local.get $0
  i64.const 33
  i64.shr_u
  i64.xor
  i64.const -49064778989728563
  i64.mul
  local.tee $0
  local.get $0
  i64.const 33
  i64.shr_u
  i64.xor
  i64.const -4265267296055464877
  i64.mul
  local.tee $0
  local.get $0
  i64.const 33
  i64.shr_u
  i64.xor
  global.set $assembly/index/state0
  global.get $assembly/index/state0
  i64.const -1
  i64.xor
  local.tee $0
  local.get $0
  i64.const 33
  i64.shr_u
  i64.xor
  i64.const -49064778989728563
  i64.mul
  local.tee $0
  local.get $0
  i64.const 33
  i64.shr_u
  i64.xor
  i64.const -4265267296055464877
  i64.mul
  local.tee $0
  local.get $0
  i64.const 33
  i64.shr_u
  i64.xor
  global.set $assembly/index/state1
 )
)
