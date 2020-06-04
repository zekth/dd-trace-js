'use strict'

wrapIt()

const { builtinModules } = require('module')
const assert = require('assert')

describe('ESM', () => {
  const tracer = require('../').init()
  tracer._instrumenter._loader._names.forEach((m) => {
    it(m, async () => {
      try {
        require.resolve(m)
      } catch {
        return
      }
      const cjs = require(m)
      const esm = await import(m)
      if (builtinModules.includes(m)) {
        assert.deepStrictEqual(cjs, esm.default)
      }
      Object.keys(esm).forEach((k) => {
        if (k === 'default') {
          return
        }
        assert.deepStrictEqual(cjs[k], esm[k])
      })
    })
  })
})
