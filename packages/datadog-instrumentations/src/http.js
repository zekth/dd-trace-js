'use strict'

const { AsyncResource } = require('async_hooks')
const {
  channel,
  addHook,
  bind,
  bindAsyncResource,
  bindEventEmitter
} = require('./helpers/instrument')
const shimmer = require('../../datadog-shimmer')
const web = require('../../dd-trace/src/plugins/util/web')

addHook({ name: 'http' }, http => {
  const startCh = channel('apm:http:request:start')
  const asyncEndCh1 = channel('apm:http:request:async-end1')
  const asyncEndCh2 = channel('apm:http:request:async-end2')
  const endCh = channel('apm:http:request:end')
  const errorCh = channel('apm:http:request:error')

  // if (this.config.server === false) return

  shimmer.wrap(http.Server.prototype, 'emit', (emit) => function (eventName, req, res) {
    const asyncResource = new AsyncResource('bound-anonymous-fn')
    debugger;
    const config = web.web.normalizeConfig({})

    
    if (!startCh.hasSubscribers) {
      return emit.apply(this, arguments)
    }

    if (eventName === 'request') {
      debugger;

      return wrapInstrumentation(startCh, asyncEndCh1, asyncEndCh2, endCh, errorCh, asyncResource, req, res, config, () => {
        return emit.apply(this, arguments)
      })
    }
    debugger;

    return emit.apply(this, arguments)
  })

  if (http.ServerResponse) { // not present on https
    // Scope._wrapEmitter(http.ServerResponse.prototype)
    bindEventEmitter(http.ServerResponse.prototype)
  }

  return http
})  

function wrapCallback (ar, callback) {
  if (typeof callback !== 'function') return callback

  return function () {
    return ar.runInAsyncScope(() => {
      return callback.apply(this, arguments)
    })
  }
}

function wrapInstrumentation(startCh, asyncEndCh1, asyncEndCh2 , endCh, errorCh, ar, req, res, config, callback) {
  debugger;
  startCh.publish([req, res, config])
  debugger;

  if (!req._datadog.instrumented) {
    debugger;
    wrapEnd(req, asyncEndCh1, asyncEndCh2, endCh, errorCh)
    // wrapEvents(req, endCh)
    // const cb = bind(function () {
    //   asyncEndCh.publish(undefined)
    //   endCh.publish(undefined)
    // })
    

    req._datadog.instrumented = true
    endCh.publish(undefined)
  }

  return callback && ar.runInAsyncScope(() => {
    return callback.apply(this, arguments)
  })
}

function beforeEnd (req, callback) {
  req._datadog.beforeEnd.push(callback)
}

function wrapEnd (req, asyncEndCh1, asyncEndCh2, endCh, errorCh) {
  // const scope = req._datadog.tracer.scope()
  const res = req._datadog.res
  const end = res.end

  res.writeHead = web.wrapWriteHead(req)

  res._datadog_end = function () {
    debugger;
    for (const beforeEnd of req._datadog.beforeEnd) {
      beforeEnd()
    }

    asyncEndCh1.publish([req])
    
    const returnValue = end.apply(res, arguments)

    // finish(req, res)
    asyncEndCh2.publish([req,res])
    
    return returnValue
  }
  debugger;
  Object.defineProperty(res, 'end', {
    configurable: true,
    get () {
      return this._datadog_end
    },
    set (value) {
      this._datadog_end = bind(value)
    }
  })
}

function wrapEvents (req, endCh) {
  debugger;
  const res = bind(req._datadog.res)
  endCh.publish(undefined)
}