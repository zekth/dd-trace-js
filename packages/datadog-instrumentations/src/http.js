'use strict'

const url = require('url')
const {
  channel,
  addHook,
  AsyncResource
} = require('./helpers/instrument')
const shimmer = require('../../datadog-shimmer')
const { storage } = require('../../datadog-core')
const { incomingHttpRequestStart } = require('../../dd-trace/src/appsec/gateway/channels')
const web = require('./helpers/web')
const log = require('../../dd-trace/src/log')

const startServerCh = channel('apm:httpServer:request:start')
const endServerCh = channel('apm:httpServer:request:end')
const errorServerCh = channel('apm:httpServer:request:error')

const startClientCh = channel('apm:httpClient:request:start')
const asyncEndClientCh = channel('apm:httpClient:request:async-end')
const endClientCh = channel('apm:httpClient:request:end')
const errorClientCh = channel('apm:httpClient:request:error')

function patch (http, methodName) {
  shimmer.wrap(http, methodName, fn => makeRequestTrace(fn))

  function makeRequestTrace (request) {
    return function requestTrace () {
      const asyncResource = new AsyncResource('bound-anonymous-fn')
      const store = storage.getStore()

      if (store && store.noop) return request.apply(this, arguments)

      let args

      try {
        args = normalizeArgs.apply(null, arguments)
      } catch (e) {
        log.error(e)
        return request.apply(this, arguments)
      }
      startClientCh.publish([args, http])

      let callback = args.callback

      if (callback) {
        callback = asyncResource.bind(callback)
      }

      const options = args.options
      const req = AsyncResource.bind(request).call(this, options, callback)
      const emit = req.emit

      req.emit = function (eventName, arg) {
        switch (eventName) {
          case 'response': {
            const res = arg
            bindEmit(res)
            res.on('end', AsyncResource.bind(() => asyncEndClientCh.publish([req, res])))
            break
          }
          case 'error':
            errorClientCh.publish([arg])
          case 'abort': // eslint-disable-line no-fallthrough
          case 'timeout': // eslint-disable-line no-fallthrough
            asyncEndClientCh.publish([req, null])
        }

        try {
          return emit.apply(this, arguments)
        } catch (err) {
          err.stack // trigger getting the stack at the original throwing point
          errorClientCh.publish(arg)

          throw err
        } finally {
          endClientCh.publish(undefined)
        }
      }
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
  patch.call(this, http, 'request')
  patch.call(this, http, 'get')

  shimmer.wrap(http.Server.prototype, 'emit', wrapEmit)

  return http
})

addHook({ name: 'http' }, http => {
  patch.call(this, http, 'request')
  patch.call(this, http, 'get')

  shimmer.wrap(http.Server.prototype, 'emit', wrapEmit)

  if (http.ServerResponse) { // not present on https
    bindEmit(http.ServerResponse.prototype)
  }
  return http
})

function wrapEmit (emit) {
  return function (eventName, req, res) {
    if (!startServerCh.hasSubscribers) {
      return emit.apply(this, arguments)
    }

    if (eventName === 'request') {
      return web.web.instrument(startServerCh, req, res, () => {
        if (incomingHttpRequestStart.hasSubscribers) {
          incomingHttpRequestStart.publish({ req, res })
        }
        try {
          return emit.apply(this, arguments)
        } catch (err) {
          err.stack // trigger getting the stack at the original throwing point
          errorServerCh.publish(err)

          throw err
        } finally {
          endServerCh.publish(undefined)
        }
      })
    }

    return emit.apply(this, arguments)
  }
}

function bindEmit (emitter, asyncResource) {
  shimmer.wrap(emitter, 'emit', emit => function (eventName, ...args) {
    const ar = asyncResource || new AsyncResource('bound-anonymous-fn')
    return ar.runInAsyncScope(() => {
      return emit.apply(this, arguments)
    })
  })
}
