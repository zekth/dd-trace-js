'use strict'

const { executionAsyncId, triggerAsyncId } = require('async_hooks')
const url = require('url')
const {
  channel,
  addHook,
  AsyncResource,
  bindEventEmitter,
  bindEmit
} = require('./helpers/instrument')
const shimmer = require('../../datadog-shimmer')
const web = require('../../dd-trace/src/plugins/util/web')
const { storage } = require('../../datadog-core')
const { incomingHttpRequestStart } = require('../../dd-trace/src/appsec/gateway/channels')
const {
  normalizeConfig
} = require('./helpers/web')
const urlFilter = require('../../dd-trace/src/plugins/util/urlfilter')
const log = require('../../dd-trace/src/log')

const startCh = channel('apm:http:request:start')
const asyncEndCh1 = channel('apm:http:request:async-end1')
const asyncEndCh2 = channel('apm:http:request:async-end2')
const endCh = channel('apm:http:request:end')
const errorCh = channel('apm:http:request:error')

function patch (http, methodName) {
  const startClientCh = channel('apm:httpClient:request:start')
  const asyncEndClientCh = channel('apm:httpClient:request:async-end')
  const endClientCh = channel('apm:httpClient:request:end')
  const errorClientCh = channel('apm:httpClient:request:error')
  debugger;
  
  shimmer.wrap(http, methodName, fn => makeRequestTrace(fn))
  
  function makeRequestTrace (request) {
    return function requestTrace () {
      const store = storage.getStore()
      if (store && store.noop) return request.apply(this, arguments)

      let args

      try {
        debugger;
        // startCh.publish(arguments)
        args = normalizeArgs.apply(null, arguments)
        // console.log(55, args)
      } catch (e) {
        // console.log(e)
        log.error(e)
        return request.apply(this, arguments)
      }
      debugger;
      startClientCh.publish([args, http])

      let callback = args.callback

      console.log(55, callback)
      callback = AsyncResource.bind(callback)
      const options = args.options
      const req = AsyncResource.bind(request).call(this, options, callback)
      const emit = req.emit

      req.emit = function (eventName, arg) {
        switch (eventName) {
          case 'response': {
            const res = arg

            // console.log(res)
            // AsyncResource.bind(res)
            bindEmit(res)

            res.on('end', () => asyncEndClientCh.publish([req, res]))

            break
          }
          case 'error':
            errorCh.publish(arg)
          case 'abort': // eslint-disable-line no-fallthrough
          case 'timeout': // eslint-disable-line no-fallthrough
            asyncEndClientCh.publish([req, null])
        }

        try {
          return emit.apply(this, arguments)
        } catch(err) {
          err.stack // trigger getting the stack at the original throwing point
          errorClientCh.publish(arg)
    
          throw err
        } finally {
          endClientCh.publish(undefined)
        }
        
      }

      // AsyncResource.bind(req)
      bindEmit(req)

      return req
    }
  }

  function normalizeArgs (inputURL, inputOptions, cb) {
    inputURL = normalizeOptions(inputURL)

    const [callback, inputOptionsNormalized] = normalizeCallback(inputOptions, cb, inputURL)
    const options = combineOptions(inputURL, inputOptionsNormalized)
    normalizeHeaders(options)
    const uri = url.format(options)

    return { uri, options, callback }
  }

  function combineOptions (inputURL, inputOptions) {
    if (typeof inputOptions === 'object') {
      return Object.assign(inputURL || {}, inputOptions)
    } else {
      return inputURL
    }
  }
  function normalizeHeaders (options) {
    options.headers = options.headers || {}
  }

  function normalizeCallback (inputOptions, callback, inputURL) {
    if (typeof inputOptions === 'function') {
      return [inputOptions, inputURL || {}]
    } else {
      return [callback, inputOptions]
    }
  }

  function normalizeOptions (inputURL) {
    if (typeof inputURL === 'string') {
      try {
        return urlToOptions(new url.URL(inputURL))
      } catch (e) {
        return url.parse(inputURL)
      }
    } else if (inputURL instanceof url.URL) {
      return urlToOptions(inputURL)
    } else {
      return inputURL
    }
  }

  function urlToOptions (url) {
    const agent = url.agent || http.globalAgent
    const options = {
      protocol: url.protocol || agent.protocol,
      hostname: typeof url.hostname === 'string' && url.hostname.startsWith('[')
        ? url.hostname.slice(1, -1)
        : url.hostname ||
        url.host ||
        'localhost',
      hash: url.hash,
      search: url.search,
      pathname: url.pathname,
      path: `${url.pathname || ''}${url.search || ''}`,
      href: url.href
    }
    if (url.port !== '') {
      options.port = Number(url.port)
    }
    if (url.username || url.password) {
      options.auth = `${url.username}:${url.password}`
    }
    return options
  }

  
}

addHook({ name: 'https' }, http => {
  debugger;
  patch.call(this, http, 'request')
  patch.call(this, http, 'get')

  shimmer.wrap(http.Server.prototype, 'emit', wrapEmit)

  return http
})

addHook({ name: 'http' }, http => {
  debugger;
  

  debugger;
  patch.call(this, http, 'request')
  patch.call(this, http, 'get')

  shimmer.wrap(http.Server.prototype, 'emit', wrapEmit)

  if (http.ServerResponse) { // not present on https
    bindEmit(http.ServerResponse.prototype)
  }

  return http
})  

function wrapEmit(emit) {
  return function (eventName, req, res) {
    const asyncResource = new AsyncResource('bound-anonymous-fn')
    const config = web.web.normalizeConfig({})
    
    if (!startCh.hasSubscribers) {
      return emit.apply(this, arguments)
    }

    if (eventName === 'request') {
      
      return wrapInstrumentation(startCh, asyncResource, asyncEndCh1, asyncEndCh2, endCh, errorCh, req, res, config, () => {
        if (incomingHttpRequestStart.hasSubscribers) {
          incomingHttpRequestStart.publish({ req, res })
        }
        // console.log(45, storage.getStore())
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
    
    return emit.apply(this, arguments)
  }
}

function wrapInstrumentation(startCh, asyncResource, asyncEndCh1, asyncEndCh2 , endCh, errorCh, req, res, config, callback) {
  
  startCh.publish([req, res, config])
  
  if (!req._datadog.instrumented) {
    
    wrapEnd(req, asyncEndCh1, asyncEndCh2, endCh, errorCh)
    
    req._datadog.instrumented = true
  }
  const ar = new AsyncResource('bound-anonymous-fn')

  return callback && ar.runInAsyncScope(() => {
    return callback.apply(this, arguments)
  })
}

function beforeEnd (req, callback) {
  req._datadog.beforeEnd.push(callback)
}

function wrapEnd (req, asyncEndCh1, asyncEndCh2, endCh, errorCh) {
  const asyncResource = new AsyncResource('bound-anonymous-fn')
  const res = req._datadog.res
  const end = res.end

  req._datadog.res.writeHead = web.wrapWriteHead(req)

  req._datadog.res._datadog_end = function () {
    for (const beforeEnd of req._datadog.beforeEnd) {
      beforeEnd()
    }
    
    if (!req._datadog.finished) {
      asyncEndCh1.publish([req])
    }

    const returnValue = end.apply(res, arguments)
    asyncEndCh2.publish([req,res])
    
    return returnValue
  }
  Object.defineProperty(res, 'end', {
    configurable: true,
    get () {
      return this._datadog_end
    },
    set (value) {
      this._datadog_end = asyncResource.bind(asyncResource, value)
    }
  })
}