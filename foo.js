'use strict'

const spanStub = require('./benchmark/stubs/span')

const ScopeManager = require('./src/scope/new/scope_manager')

const scopeManager = new ScopeManager()

// const cls = require('continuation-local-storage')
// cls.createNamespace('dd-trace')

// const asyncHooks = require('async_hooks')

// asyncHooks.createHook({
//   init () {},
//   before () {},
//   after () {},
//   destroy () {},
//   promiseResolve () {}
// }).enable()

// require('async-listener')

// process.addAsyncListener({
//   create: function () { return null },
//   before: function (context, storage) { },
//   after: function (context, storage) { },
//   error: function (storage) { }
// })

benchPromise()

function benchTimer () {
  console.time('timer')

  let done = 0

  for (let i = 0; i < 1000; i++) {
    recurse(0)
  }

  function recurse (count) {
    if (count < 1000) {
      process.nextTick(() => {
        // if (count % 10 === 0) {
        //   scopeManager.activate({})
        // }

        recurse(count + 1)
      })
    } else {
      done++

      if (done === 1000) {
        console.timeEnd('timer')
      }
    }
  }
}

function benchPromise () {
  console.time('promise')

  let done = 0

  for (let i = 0; i < 1000; i++) {
    recurse(0)
  }

  function recurse (count) {
    if (count < 1000) {
      Promise.resolve().then(() => {
        if (count % 10 === 0) {
          scopeManager.activate({})
        }

        recurse(count + 1)
      })
    } else {
      done++

      if (done === 1000) {
        console.timeEnd('promise')
      }
    }
  }
}

// console.timeEnd('test')

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
