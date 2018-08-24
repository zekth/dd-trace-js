'use strict'

const proxyquire = require('proxyquire')
const benchmark = require('./benchmark')

const suite = benchmark('scope')

const spanStub = require('./stubs/span')

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

const ScopeManager = proxyquire('../src/scope/scope_manager', {
  './async_hooks': asyncHooks
})

const scopeManager = new ScopeManager()

suite
  // .add('ScopeManager (sync)', {
  //   fn () {
  //     const scope = scopeManager.activate(spanStub)

  //     scope.close()
  //   }
  // })
  // .add('ScopeManager (async)', {
  //   fn () {
  //     asyncHooks.init(1)
  //     asyncHooks.before(1)

  //     const scope = scopeManager.activate(spanStub)

  //     scope.close()

  //     asyncHooks.after(1)
  //     asyncHooks.destroy(1)
  //   }
  // })
  // .add('ScopeManager (nested)', {
  //   fn () {
  //     let id = 1

  //     asyncHooks.init(id)
  //     asyncHooks.before(id)

  //     while (id < 10) {
  //       const scope = scopeManager.activate(spanStub)

  //       asyncHooks.init(id + 1)
  //       scope.close()
  //       asyncHooks.after(id)
  //       asyncHooks.destroy(id)
  //       asyncHooks.before(id + 1)

  //       id++
  //     }

  //     asyncHooks.after(id)
  //     asyncHooks.destroy(id)
  //   }
  // })
  .add('ScopeManager (no scope)', {
    fn () {
      asyncHooks.init(1)
      asyncHooks.before(1)
      asyncHooks.after(1)
      asyncHooks.destroy(1)
    }
  })
  .add('ScopeManager (no scope nested)', {
    fn () {
      let id = 1

      scopeManager.activate({})
      asyncHooks.init(id)
      asyncHooks.before(id)

      while (id < 100) {
        asyncHooks.init(id + 1)
        asyncHooks.after(id)
        asyncHooks.destroy(id)
        asyncHooks.before(id + 1)

        id++
      }

      asyncHooks.after(id)
      asyncHooks.destroy(id)
    }
  })

suite.run()
