'use strict'

const { executionAsyncId, triggerAsyncId } = require('async_hooks')
const {
  channel,
  addHook,
  AsyncResource,
  bindEventEmitter
} = require('./helpers/instrument')
const shimmer = require('../../datadog-shimmer')
const web = require('../../dd-trace/src/plugins/util/web')
const { storage } = require('../../datadog-core')
const { incomingHttpRequestStart } = require('../../dd-trace/src/appsec/gateway/channels')

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
    
    // if (req && req.ServerResponse) {
    //   console.log(1)
    //   bindEventEmitter(req.ServerResponse.prototype)
    // }

    // if (res && res.ServerResponse) {
    //   console.log(2)
    //   bindEventEmitter(res.ServerResponse.prototype)
    // }
    
    if (!startCh.hasSubscribers) {
      return emit.apply(this, arguments)
    }
    // if (res) {
    //   debugger;
    //   bindEventEmitter(res)
    // }

    if (eventName === 'request') {
      debugger;
      
      return wrapInstrumentation(startCh, asyncResource, asyncEndCh1, asyncEndCh2, endCh, errorCh, req, res, config, () => {
        debugger;
        if (incomingHttpRequestStart.hasSubscribers) {
          incomingHttpRequestStart.publish({ req, res })
        }
        console.log(45, storage.getStore())
        try {
          return emit.apply(this, arguments)
        } catch (err) {
          err.stack // trigger getting the stack at the original throwing point
          errorCh.publish(err)

          throw err
        } finally {
          endCh.publish(undefined)
        }
      })
    }
    debugger;
    
    return emit.apply(this, arguments)
  })

  if (http.ServerResponse) { // not present on https
    // Scope._wrapEmitter(http.ServerResponse.prototype)
    debugger;
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

function wrapInstrumentation(startCh, asyncResource, asyncEndCh1, asyncEndCh2 , endCh, errorCh, req, res, config, callback) {
  debugger;
  
  startCh.publish([req, res, config])
  debugger;
  
  
  if (!req._datadog.instrumented) {
    debugger;
    
    wrapEnd(req, asyncEndCh1, asyncEndCh2, endCh, errorCh)
    // bindEventEmitter(req)
    // bindEventEmitter(res)
    // wrapEvents(req, endCh)
    // const cb = bind(function () {
    //   asyncEndCh.publish(undefined)
    //   endCh.publish(undefined)
    // })
    
    wrapEvents(req)
    debugger;
    
    req._datadog.instrumented = true
    console.log(33, storage.getStore())
  }
  
  // callback = asyncResource.bind(callback)
  const ar = new AsyncResource('bound-anonymous-fn')

  return callback && ar.runInAsyncScope(() => {
    console.log(45, storage.getStore())
    return callback.apply(this, arguments)
    debugger;
  })
  // return callback && asyncResource.bind(callback, this).apply(this, arguments)
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
    const returnValue = end.apply(res, arguments)
    bindEventEmitter(returnValue)
    debugger;
    // finish(req, res)
    asyncEndCh2.publish([req,res])
    
    return returnValue
  }
  debugger;
  Object.defineProperty(res, 'end', {
    configurable: true,
    get () {
      debugger;
      return this._datadog_end
    },
    set (value) {
      debugger;
      this._datadog_end = asyncResource.bind(asyncResource, value)
    }
  })
  debugger;
  // console.log(res.end.toString())
  // res.end = bind(res.end)
  // bindEventEmitter(res)
}

function wrapEvents (req) {
  debugger;
  // return req
  const res = req._datadog.res

  // AsyncResource.bind(res, req._datadog.span)
}