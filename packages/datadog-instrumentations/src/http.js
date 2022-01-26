'use strict'

const { executionAsyncId, triggerAsyncId, AsyncResource } = require('async_hooks')
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
  if (http.ServerResponse) { // not present on https
    // Scope._wrapEmitter(http.ServerResponse.prototype)
    debugger;
    bindEventEmitter(http.ServerResponse.prototype)
  }

  shimmer.wrap(http.Server.prototype, 'emit', (emit) => function (eventName, req, res) {
    const asyncResource = new AsyncResource('bound-anonymous-fn')
    debugger;
    const config = web.web.normalizeConfig({})

    if (req && req.ServerResponse) {
      console.log(1)
      bindEventEmitter(req.ServerResponse.prototype)
    }

    if (res && res.ServerResponse) {
      console.log(2)
      bindEventEmitter(res.ServerResponse.prototype)
    }
    
    if (!startCh.hasSubscribers) {
      return emit.apply(this, arguments)
    }
    // if (res) {
    //   debugger;
    //   bindEventEmitter(res)
    // }

    if (eventName === 'request') {
      debugger;
      const id = executionAsyncId()
      return wrapInstrumentation(startCh, asyncEndCh1, asyncEndCh2, endCh, errorCh, req, res, config, () => {
        debugger;
        console.log(id, triggerAsyncId())
        const returnVal = emit.apply(this, arguments)
        debugger;
        console.log(2, returnVal)
        return returnVal
      })
    }
    debugger;

    return emit.apply(this, arguments)
  })

  

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

function wrapInstrumentation(startCh, asyncEndCh1, asyncEndCh2 , endCh, errorCh, req, res, config, callback) {
  debugger;
  const asyncResource = new AsyncResource('bound-anonymous-fn')
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
    wrapEvents(req)
    debugger;
    
    req._datadog.instrumented = true
    endCh.publish(undefined)
  }

  return callback && asyncResource.runInAsyncScope(() => {
    // return callback.apply(this, arguments)
    callback()
  })
}

function beforeEnd (req, callback) {
  req._datadog.beforeEnd.push(callback)
}

function wrapEnd (req, asyncEndCh1, asyncEndCh2, endCh, errorCh) {
  const asyncResource = new AsyncResource('bound-anonymous-fn')
  // const scope = req._datadog.tracer.scope()
  const res = req._datadog.res
  const end = res.end

  req._datadog.res.writeHead = web.wrapWriteHead(req)

  req._datadog.res._datadog_end = function () {
    debugger;
    for (const beforeEnd of req._datadog.beforeEnd) {
      beforeEnd()
    }
    
    if (!req._datadog.finished) {
      asyncEndCh1.publish([req])
    }
   
    debugger;
    const returnValue = req._datadog.res.end.apply(res, arguments)
    bindEventEmitter(returnValue)
    debugger;
    // finish(req, res)
    asyncEndCh2.publish([req,res])
    
    return returnValue
  }
  debugger;
  console.log(Object.toString())
  Object.defineProperty(res, 'end', {
    configurable: true,
    get () {
      debugger;
      return this._datadog_end
    },
    set (value) {
      debugger;
      this._datadog_end = bind(value, req._datadog.span)
    }
  })
  debugger;
  bindEventEmitter(res)
}

function wrapEvents (req) {
  debugger;
  req._datadog.res = bind(req._datadog.span)
}