'use strict'

let asyncHook

try {
  // load async-hook if the user is using it
  asyncHook = require('async-hook')
} catch (e) {
  // otherwise load the more recent async-hook-jl
  asyncHook = require('async-hook-jl')
}

const providers = process.binding('async_wrap').Providers
const types = {}

for (const key in providers) {
  types[providers[key]] = key
}

module.exports = {
  createHook: (callbacks) => {
    const hooks = {
      init: (uid, handle, provider, parentUid, parentHandle) => {
        callbacks.init(uid, types[provider])
      },
      pre: (uid, handle) => {
        callbacks.before(uid)
      },
      post: (uid, handle, didThrow) => {
        callbacks.after(uid)
      },
      destroy: (uid) => {
        callbacks.destroy(uid)
      }
    }

    asyncHook.enable()

    return {
      enable: () => asyncHook.addHooks(hooks),
      disable: () => asyncHook.removeHooks(hooks)
    }
  }
}
