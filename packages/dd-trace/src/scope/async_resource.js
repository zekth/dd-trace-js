'use strict'

const { createHook, executionAsyncResource } = require('async_hooks')
const semver = require('semver')
const Base = require('./base')
const metrics = require('../metrics')

let singleton = null

class Scope extends Base {
  constructor (config) {
    if (singleton) return singleton

    super()

    singleton = this

    this._ddResourceStore = Symbol('ddResourceStore')
    this._registry = this._createRegistry()
    this._config = config
    this._stack = []
    this._hook = createHook({
      init: this._init.bind(this)
    })

    this.enable()
  }

  enable () {
    this._enabled = true
    this._hook.enable()
  }

  disable () {
    this._enabled = false
    this._stack = []
    this._hook.disable()
  }

  _active () {
    if (!this._enabled) return null

    const resource = this._activeResource()

    return resource[this._ddResourceStore] || null
  }

  _activeResource () {
    return executionAsyncResource() || {}
  }

  _activate (span, callback) {
    if (!this._enabled) return callback()

    const resource = this._activeResource()

    this._enter(span, resource)

    try {
      return callback()
    } finally {
      this._exit(resource)
    }
  }

  _enter (span, resource) {
    this._stack.push(resource[this._ddResourceStore])
    resource[this._ddResourceStore] = span
  }

  _exit (resource) {
    resource[this._ddResourceStore] = this._stack.pop()
  }

  _init (asyncId, type, triggerAsyncId, resource) {
    const triggerResource = this._activeResource()
    const span = triggerResource[this._ddResourceStore]

    if (span) {
      resource[this._ddResourceStore] = span
    }

    if (this._registry) {
      metrics.increment('runtime.node.async.resources')
      metrics.increment('runtime.node.async.resources.by.type', `resource_type:${type}`)

      this._registry.register(resource, type)
    }
  }

  _createRegistry () {
    if (!this._debug || !semver.satisfies(process.version, '>=14.6')) return

    return new global.FinalizationRegistry(type => {
      metrics.decrement('runtime.node.async.resources')
      metrics.decrement('runtime.node.async.resources.by.type', `resource_type:${type}`)
    })
  }
}

module.exports = Scope
