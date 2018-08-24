'use strict'

const proxyquire = require('proxyquire')

const spanStub = require('./benchmark/stubs/span')

const hook = {
  enable () {},
  disable () {}
}

const asyncHooks = {
  createHook (hooks) {
    Object.keys(hooks).forEach(key => {
      this[key] = hooks[key]
    })

    return hook
  }
}

const ScopeManager = proxyquire('./src/scope/new/scope_manager', {
  '../async_hooks': asyncHooks
})

const scopeManager = new ScopeManager()

// const ah = require('async_hooks')

// ah.createHook({
//   init () {},
//   before () {},
//   after () {},
//   destroy () {},
//   promiseResolve () {}
// }).enable()

// const cls = require('continuation-local-storage')
// const ns = cls.createNamespace('test')

console.time('test')

// for (let i = 0; i < 1000000; i++) {
//   ns.run(() => {})
// }

let id = 1

asyncHooks.init(id)
asyncHooks.before(id)

while (id < 10) {
  const scope = scopeManager.activate({})
  asyncHooks.init(id + 1)
  scope.close()
  asyncHooks.after(id)
  asyncHooks.destroy(id)
  asyncHooks.before(id + 1)

  id++
}

asyncHooks.after(id)
asyncHooks.destroy(id)

console.timeEnd('test')

// const ScopeManager = require('./src/scope/new/scope_manager')

// const scopeManager = new ScopeManager()

// console.time('test')

// const promises = []

// for (let i = 0; i < 100000; i++) {
//   // const scope = scopeManager.activate({})

//   // promises.push(Promise.resolve().then(() => scope.close()))
//   promises.push(Promise.resolve().then(() => {}))

//   // scope.close()
// }

// Promise.all(promises).then(() => {
//   console.timeEnd('test')
// })
