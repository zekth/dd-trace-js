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
  const asyncEndCh = channel('apm:http:request:async-end')
  const endCh = channel('apm:http:request:end')
  const errorCh = channel('apm:http:request:error')

  // if (this.config.server === false) return

  shimmer.wrap(http.Server.prototype, 'emit', (emit) => function (eventName, req, res) {
    debugger;
    const config = web.web.normalizeConfig({})

    const asyncResource = new AsyncResource('bound-anonymous-fn')
    if (!startCh.hasSubscribers) {
      return emit.apply(this, arguments)
    }

    if (eventName === 'request') {
      // return web.instrument(tracer, config, req, res, 'http.request', () => {
      //   return emit.apply(this, arguments)
      // })
      startCh.publish([req, res, config])

      if (!req._datadog.instrumented) {
        debugger;
        const newRes = req._datadog.res
        newRes.writeHead = web.wrapWriteHead(req)

        newRes._datadog_end = function () {
          for (const beforeEnd of req._datadog.beforeEnd) {
            beforeEnd()
          }
      
          // web.finishMiddleware(req, newRes)
          asyncEndCh.publish(undefined)
      
          const returnValue = res.end.apply(newRes, arguments)
          
          asyncEndCh.publish([req])
          // web.finish(req, newRes)
      
          return returnValue
        }
      
        Object.defineProperty(newRes, 'end', {
          configurable: true,
          get () {
            return this._datadog_end
          },
          set (value) {
            this._datadog_end = bind(value, req._datadog.span)
          }
        })

        // web.wrapEnd(req)
        // web.wrapEvents(req)
        // bind(newRes, req._datadog.span)
        
        // const cb = bindAsyncResource.call(asyncResource, newRes)
        // newRes = cb
        req._datadog.instrumented = true
      }
      // emit = bind(emit)
      // return emit.apply(this, arguments)
      const cb = () => {
        return emit.apply(this, arguments)
      }
      // c
      return cb && bind(cb)
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

addHook({ name: 'https' }, https => {
  const startCh = channel('apm:http:request:start')
  const asyncEndCh = channel('apm:http:request:async-end')
  const endCh = channel('apm:http:request:end')
  const errorCh = channel('apm:http:request:error')

  if (this.config.server === false) return

  shimmer.wrap(http.Server.prototype, 'emit', emit => function (eventName, req, res) {
    debugger;
    const config = web.web.normalizeConfig(this.config)

    const asyncResource = new AsyncResource('bound-anonymous-fn')
    if (!startCh.hasSubscribers) {
      return emit.apply(this, arguments)
    }

    if (eventName === 'request') {
      // return web.instrument(tracer, config, req, res, 'http.request', () => {
      //   return emit.apply(this, arguments)
      // })
      startCh.publish([req, res, config])
    }

    if (!req._datadog.instrumented) {
      res.writeHead = web.wrapWriteHead(req)
      // yet to do not needed for http
      // req._datadog.res._datadog_end = bind(function (error, result) {
      //   for (const beforeEnd of req._datadog.beforeEnd) {
      //     beforeEnd()
      //   }

      //   if (error) {
      //     errorCh.publish(error)
      //   }
      //   asyncEndCh.publish([req])

      //   const returnValue = resend.apply(res, arguments)

      //   return cb.apply(this, arguments)
      // })
      // wrapEnd(req)
      // wrapEvents(req)

      req._datadog.instrumented = true
    }

    return emit.apply(this, arguments)
  })
  
  return https
})  