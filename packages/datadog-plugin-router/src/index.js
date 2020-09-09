'use strict'

const METHODS = require('methods').concat('all')
const web = require('../../dd-trace/src/plugins/util/web')

function createWrapHandle (tracer, config) {
  return function wrapHandle (handle) {
    return function handleWithTracer (req, res, done) {
      web.patch(req)

      return handle.apply(this, arguments)
    }
  }
}

function wrapRouterMethod (original) {
  return function methodWithTrace (fn) {
    const offset = this.stack ? [].concat(this.stack).length : 0
    const router = original.apply(this, arguments)

    if (typeof this.stack === 'function') {
      this.stack = [{ handle: this.stack }]
    }

    wrapStack(this.stack, offset)

    return router
  }
}

function wrapLayerHandle (layer, handle) {
  handle._name = handle._name || layer.name

  let wrapCallHandle

  if (handle.length === 4) {
    wrapCallHandle = function (error, req, res, next) {
      return callHandle(layer, handle, req, [error, req, res, wrapNext(layer, req, next)])
    }
  } else {
    wrapCallHandle = function (req, res, next) {
      return callHandle(layer, handle, req, [req, res, wrapNext(layer, req, next)])
    }
  }

  // This is a workaround for the `loopback` library so that it can find the correct express layer
  // that contains the real handle function
  wrapCallHandle._datadog_orig = handle

  return wrapCallHandle
}

function wrapStack (stack, offset) {
  [].concat(stack).slice(offset).forEach(layer => {
    if (layer.__handle) { // express-async-errors
      layer.__handle = wrapLayerHandle(layer, layer.__handle)
    } else {
      layer.handle = wrapLayerHandle(layer, layer.handle)
    }

    if (layer.route) {
      METHODS.forEach(method => {
        if (typeof layer.route.stack === 'function') {
          layer.route.stack = [{ handle: layer.route.stack }]
        }

        layer.route[method] = wrapRouterMethod(layer.route[method])
      })
    }
  })
}

function wrapNext (layer, req, next) {
  if (!next || !web.active(req)) return next

  const originalNext = next

  return function (error) {
    if (!error && layer.path) {
      web.exitRoute(req)
    }

    web.finish(req, error)

    originalNext.apply(null, arguments)
  }
}

function callHandle (layer, handle, req, args) {
  if (layer.path && layer._datadog_path && web.active(req)) {
    web.enterRoute(req, layer._datadog_path)
  }

  return web.wrapMiddleware(req, handle, 'express.middleware', () => {
    return handle.apply(layer, args)
  })
}

function getFirstElementOfArray (arr) {
  return Array.isArray(arr) ? getFirstElementOfArray(arr[0]) : arr
}

module.exports = [
  {
    name: 'router',
    versions: ['>=1'],
    file: 'lib/layer.js',
    patch (Layer) {
      return this.wrapExport(Layer, function (...args) {
        const layer = new Layer(...args)
        const firstArg = getFirstElementOfArray(args[0])
        layer._datadog_path = firstArg instanceof RegExp ? `(${firstArg})` : firstArg
        return layer
      })
    },
    unpatch (Layer) {
      return this.unwrapExport(Layer)
    }
  },
  {
    name: 'router',
    versions: ['>=1'],
    patch (Router, tracer, config) {
      this.wrap(Router.prototype, 'handle', createWrapHandle(tracer, config))
      this.wrap(Router.prototype, 'use', wrapRouterMethod)
      this.wrap(Router.prototype, 'route', wrapRouterMethod)
    },
    unpatch (Router) {
      this.unwrap(Router.prototype, 'handle')
      this.unwrap(Router.prototype, 'use')
      this.unwrap(Router.prototype, 'route')
    }
  }
]
