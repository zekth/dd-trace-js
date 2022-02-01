'use strict'

const { AsyncResource } = require('./instrument')
const uniq = require('lodash.uniq')
const log = require('../../../dd-trace/src/log')
const tags = require('../../../../ext/tags')
const kinds = require('../../../../ext/kinds')
const urlFilter = require('../../../dd-trace/src/plugins/util/urlfilter')
const types = require('../../../../ext/types')
const FORMAT_HTTP_HEADERS = require('opentracing').FORMAT_HTTP_HEADERS
const { incomingHttpRequestEnd } = require('../../../dd-trace/src/appsec/gateway/channels')

const WEB = types.WEB
const SERVER = kinds.SERVER
const RESOURCE_NAME = tags.RESOURCE_NAME
const SPAN_TYPE = tags.SPAN_TYPE
const SPAN_KIND = tags.SPAN_KIND
const ERROR = tags.ERROR
const HTTP_METHOD = tags.HTTP_METHOD
const HTTP_URL = tags.HTTP_URL
const HTTP_STATUS_CODE = tags.HTTP_STATUS_CODE
const HTTP_ROUTE = tags.HTTP_ROUTE
const HTTP_REQUEST_HEADERS = tags.HTTP_REQUEST_HEADERS
const HTTP_RESPONSE_HEADERS = tags.HTTP_RESPONSE_HEADERS

const HTTP2_HEADER_AUTHORITY = ':authority'
const HTTP2_HEADER_SCHEME = ':scheme'
const HTTP2_HEADER_PATH = ':path'

const web = {
  // Ensure the configuration has the correct structure and defaults.
  normalizeConfig (config) {
    config = config.server || config

    const headers = getHeadersToRecord(config)
    const validateStatus = getStatusValidator(config)
    const hooks = getHooks(config)
    const filter = urlFilter.getFilter(config)
    const middleware = getMiddlewareSetting(config)

    return Object.assign({}, config, {
      headers,
      validateStatus,
      hooks,
      filter,
      middleware
    })
  },

  instrument (startCh, req, res, callback) {
    startCh.publish([req, res])

    if (req._datadog && !req._datadog.instrumented) {
      wrapEnd(req)
      req._datadog.instrumented = true
    }

    const ar = new AsyncResource('bound-anonymous-fn')

    return callback && ar.runInAsyncScope(() => {
      return callback.apply(this, arguments)
    })
  },

  // Finish the active middleware span.
  finish (req, error) {
    if (!this.active(req)) return

    const span = req._datadog.middleware.pop()

    if (span) {
      if (error) {
        span.addTags({
          'error.type': error.name,
          'error.msg': error.message,
          'error.stack': error.stack
        })
      }
      span.finish()
    }
  },

  // Register a callback to run before res.end() is called.
  beforeEnd (req, callback) {
    req._datadog.beforeEnd.push(callback)
  },

  // Prepare the request for instrumentation.
  patch (req) {
    if (req._datadog) return

    if (req.stream && req.stream._datadog) {
      req._datadog = req.stream._datadog
      return
    }

    req._datadog = {
      span: null,
      paths: [],
      middleware: [],
      beforeEnd: [],
      config: {}
    }
  },

  // Extract the parent span from the headers and start a new span as its child
  startChildSpan (tracer, name, headers, store) {
    const childOf = store ? store.span : store || tracer.extract(FORMAT_HTTP_HEADERS, headers)
    const span = tracer.startSpan(name, { childOf })
    return span
  },

  // Validate a request's status code and then add error tags if necessary
  addStatusError (req, statusCode) {
    const span = req._datadog.span
    const error = req._datadog.error

    if (!req._datadog.config.validateStatus(statusCode)) {
      span.setTag(ERROR, error || true)
    }
  },

  // Add an error to the request
  addError (req, error) {
    if (error instanceof Error) {
      req._datadog.error = req._datadog.error || error
    }
  }
}

function finishMiddleware (req) {
  if (req._datadog.finished) return

  let span

  while ((span = req._datadog.middleware.pop())) {
    span.finish()
  }
}

function finish (req, res) {
  if (req._datadog.finished && !req.stream) return

  addRequestTags(req)
  addResponseTags(req)

  req._datadog.config.hooks.request(req._datadog.span, req, res)
  addResourceTag(req)

  req._datadog.span.finish()
  req._datadog.finished = true
}

function addRequestTags (req) {
  const url = extractURL(req)
  const span = req._datadog.span

  span.addTags({
    [HTTP_URL]: url.split('?')[0],
    [HTTP_METHOD]: req.method,
    [SPAN_KIND]: SERVER,
    [SPAN_TYPE]: WEB
  })

  addHeaders(req)
}

function addResponseTags (req) {
  const span = req._datadog.span
  const res = req._datadog.res

  if (req._datadog.paths.length > 0) {
    span.setTag(HTTP_ROUTE, req._datadog.paths.join(''))
  }

  span.addTags({
    [HTTP_STATUS_CODE]: res.statusCode
  })

  web.addStatusError(req, res.statusCode)
}

function addResourceTag (req) {
  const span = req._datadog.span
  const tags = span.context()._tags

  if (tags['resource.name']) return

  const resource = [req.method, tags[HTTP_ROUTE]]
    .filter(val => val)
    .join(' ')

  span.setTag(RESOURCE_NAME, resource)
}

function addHeaders (req) {
  const span = req._datadog.span

  req._datadog.config.headers.forEach(key => {
    const reqHeader = req.headers[key]
    const resHeader = req._datadog.res.getHeader(key)

    if (reqHeader) {
      span.setTag(`${HTTP_REQUEST_HEADERS}.${key}`, reqHeader)
    }

    if (resHeader) {
      span.setTag(`${HTTP_RESPONSE_HEADERS}.${key}`, resHeader)
    }
  })
}

function extractURL (req) {
  const headers = req.headers

  if (req.stream) {
    return `${headers[HTTP2_HEADER_SCHEME]}://${headers[HTTP2_HEADER_AUTHORITY]}${headers[HTTP2_HEADER_PATH]}`
  } else {
    const protocol = getProtocol(req)
    return `${protocol}://${req.headers['host']}${req.originalUrl || req.url}`
  }
}

function getProtocol (req) {
  if (req.socket && req.socket.encrypted) return 'https'
  if (req.connection && req.connection.encrypted) return 'https'

  return 'http'
}

function startSpan (tracer, config, req, res, name, store) {
  web.patch(req)

  req._datadog.config = config

  let span

  if (req._datadog.span) {
    req._datadog.span.context()._name = name
    span = req._datadog.span
  } else {
    span = web.startChildSpan(tracer, name, req.headers, store)
  }

  configureDatadogObject(tracer, span, req, res)
  return span
}

function configureDatadogObject (tracer, span, req, res) {
  const ddObj = req._datadog
  ddObj.tracer = tracer
  ddObj.span = span
  ddObj.res = res
  req._datadog.tracer = tracer
  req._datadog.span = span
  req._datadog.res = res
}

function getHeadersToRecord (config) {
  if (Array.isArray(config.headers)) {
    try {
      return config.headers.map(key => key.toLowerCase())
    } catch (err) {
      log.error(err)
    }
  } else if (config.hasOwnProperty('headers')) {
    log.error('Expected `headers` to be an array of strings.')
  }
  return []
}

function getStatusValidator (config) {
  if (typeof config.validateStatus === 'function') {
    return config.validateStatus
  } else if (config.hasOwnProperty('validateStatus')) {
    log.error('Expected `validateStatus` to be a function.')
  }
  return code => code < 500
}

function getHooks (config) {
  const noop = () => {}
  const request = (config.hooks && config.hooks.request) || noop

  return { request }
}

function getMiddlewareSetting (config) {
  if (config && typeof config.middleware === 'boolean') {
    return config.middleware
  } else if (config && config.hasOwnProperty('middleware')) {
    log.error('Expected `middleware` to be a boolean.')
  }

  return true
}

function wrapWriteHead (req) {
  const res = req._datadog.res
  const writeHead = res.writeHead

  return function (statusCode, statusMessage, headers) {
    headers = typeof statusMessage === 'string' ? headers : statusMessage
    headers = Object.assign(res.getHeaders(), headers)

    if (req.method.toLowerCase() === 'options' && isOriginAllowed(req, headers)) {
      addAllowHeaders(req, headers)
    }

    return writeHead.apply(this, arguments)
  }
}

function wrapEnd (req) {
  const asyncResource = new AsyncResource('bound-anonymous-fn')
  const res = req._datadog.res
  const end = res.end

  req._datadog.res.writeHead = wrapWriteHead(req)

  req._datadog.res._datadog_end = function () {
    for (const beforeEnd of req._datadog.beforeEnd) {
      beforeEnd()
    }

    if (!req._datadog.finished) {
      finishMiddleware(req)
    }

    if (incomingHttpRequestEnd.hasSubscribers) incomingHttpRequestEnd.publish({ req, res })

    const returnValue = end.apply(res, arguments)

    finish(req, res)
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

function isOriginAllowed (req, headers) {
  const origin = req.headers['origin']
  const allowOrigin = headers['access-control-allow-origin']

  return origin && (allowOrigin === '*' || allowOrigin === origin)
}

function addAllowHeaders (req, headers) {
  const res = req._datadog.res
  const allowHeaders = splitHeader(headers['access-control-allow-headers'])
  const requestHeaders = splitHeader(req.headers['access-control-request-headers'])
  const contextHeaders = [
    'x-datadog-origin',
    'x-datadog-parent-id',
    'x-datadog-sampled', // Deprecated, but still accept it in case it's sent.
    'x-datadog-sampling-priority',
    'x-datadog-trace-id'
  ]

  for (const header of contextHeaders) {
    if (~requestHeaders.indexOf(header)) {
      allowHeaders.push(header)
    }
  }

  if (allowHeaders.length > 0) {
    res.setHeader('access-control-allow-headers', uniq(allowHeaders).join(','))
  }
}

function splitHeader (str) {
  return typeof str === 'string' ? str.split(/\s*,\s*/) : []
}

module.exports = {
  web: web,
  startSpan: startSpan
}
