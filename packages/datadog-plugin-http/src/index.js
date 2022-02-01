'use strict'

const Plugin = require('../../dd-trace/src/plugins/plugin')
const { storage } = require('../../datadog-core')
const analyticsSampler = require('../../dd-trace/src/analytics_sampler')
const web = require('../../dd-trace/src/plugins/util/web')
const FORMAT_HTTP_HEADERS = require('opentracing').FORMAT_HTTP_HEADERS
const tags = require('../../../ext/tags')
const types = require('../../../ext/types')
const kinds = require('../../../ext/kinds')
const formats = require('../../../ext/formats')
const WEB = types.WEB
const SERVER = kinds.SERVER
const RESOURCE_NAME = tags.RESOURCE_NAME
const SERVICE_NAME = tags.SERVICE_NAME
const SPAN_TYPE = tags.SPAN_TYPE
const SPAN_KIND = tags.SPAN_KIND
const ERROR = tags.ERROR
const HTTP_METHOD = tags.HTTP_METHOD
const HTTP_URL = tags.HTTP_URL
const HTTP_STATUS_CODE = tags.HTTP_STATUS_CODE
const HTTP_ROUTE = tags.HTTP_ROUTE
const HTTP_REQUEST_HEADERS = tags.HTTP_REQUEST_HEADERS
const HTTP_RESPONSE_HEADERS = tags.HTTP_RESPONSE_HEADERS
const urlFilter = require('../../dd-trace/src/plugins/util/urlfilter')
const HTTP2_HEADER_AUTHORITY = ':authority'
const HTTP2_HEADER_SCHEME = ':scheme'
const HTTP2_HEADER_PATH = ':path'

const HTTP_HEADERS = formats.HTTP_HEADERS
const CLIENT = kinds.CLIENT

class HttpPlugin extends Plugin {
  static get name () {
    return 'http'
  }

  constructor (...args) {
    super(...args)

    debugger;
    if (this && this.config && this.config.server === false) return

    this.addSub('apm:http:request:start', ([req, res, conf]) => {
      debugger;
      const store = storage.getStore()
      // const childOf = store ? store.span : store

      patch(req)

      req._datadog.config = conf
      const name = 'http.request'

      let span
      
      if (req._datadog.span) {
        req._datadog.span.context()._name = name
        span = req._datadog.span
      } else {
        debugger;
        const temp1 = store ? store.span : store
        const temp2 = this.tracer.extract('http_headers', req.headers)
        const childOf = temp1 || temp2
        span = this.tracer.startSpan('http.request', { childOf })
      }

      debugger;
      req._datadog.tracer = this.tracer
      req._datadog.span = span
      req._datadog.res = res
      const ddObj = req._datadog
      ddObj.tracer = this.tracer
      ddObj.span = span
      ddObj.res = res

      if (!conf.filter(req.url)) {
        span.context()._traceFlags.sampled = false
      }
  
      if (conf.service) {
        span.setTag(SERVICE_NAME, config.service)
      }

      analyticsSampler.sample(span, this.config.measured, true)
      this.enter(span, store)
    })

    this.addSub('apm:http:request:end', () => {
      debugger;
      this.exit()
    })

    this.addSub('apm:http:request:error', err => {
      debugger;
      if (err) {
        const span = storage.getStore().span
        span.setTag('error', err)
      }
    })

    this.addSub('apm:http:request:async-end1', ([req]) => {
      debugger;
      if (req._datadog.finished) return

      let span

      while ((span = req._datadog.middleware.pop())) {
        span.finish()
      }
    })

    this.addSub('apm:http:request:async-end2', ([req,res]) => {
      debugger;
      web.finish(req, res)
    })

    this.addSub('apm:httpClient:request:start', ([args, http]) => {
      debugger;
      
      const store = storage.getStore()
      
      this.config = normalizeConfig(this.config)
      const options = args.options
      const agent = options.agent || options._defaultAgent || http.globalAgent
      const protocol = options.protocol || agent.protocol || 'http:'
      const hostname = options.hostname || options.host || 'localhost'
      const host = options.port ? `${hostname}:${options.port}` : hostname
      const path = options.path ? options.path.split(/[?#]/)[0] : '/'
      const uri = `${protocol}//${host}${path}`

      const method = (options.method || 'GET').toUpperCase()

      // const scope = tracer.scope()
      // const childOf = scope.active()
      const childOf = store ? store.span : store
      
      console.log(44, getServiceName(this.tracer, this.config, options))
      const span = this.tracer.startSpan('http.request', {
        childOf,
        tags: {
          [SPAN_KIND]: CLIENT,
          'service.name': getServiceName(this.tracer, this.config, options),
          'resource.name': method,
          'span.type': 'http',
          'http.method': method,
          'http.url': uri
        }
      })

      if (!(hasAmazonSignature(options) || !this.config.propagationFilter(uri))) {
        this.tracer.inject(span, HTTP_HEADERS, options.headers)
      }

      analyticsSampler.sample(span, this.config.measured)

      this.enter(span, store)
    })

    this.addSub('apm:httpClient:request:end', () => {
      debugger;
      this.exit()
    })

    this.addSub('apm:httpClient:request:async-end', ([req, res]) => {
      const span = storage.getStore().span
      if (res) {
        span.setTag(HTTP_STATUS_CODE, res.statusCode)
  
        if (!this.config.validateStatus(res.statusCode)) {
          span.setTag('error', 1)
        }
  
        addResponseHeaders(res, span, this.config)
      } else {
        span.setTag('error', 1)
      }
  
      addRequestHeaders(req, span, this.config)
  
      this.config.hooks.request(span, req, res)
  
      span.finish()
    })

    this.addSub('apm:httpClient:request:error', ([error]) => {
      debugger;
      const span = storage.getStore().span
      span.addTags({
        'error.type': error.name,
        'error.msg': error.message,
        'error.stack': error.stack
      })
  
    })
  }
}

function patch (req) {
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
}

function hasAmazonSignature (options) {
  if (!options) {
    return false
  }

  if (options.headers) {
    const headers = Object.keys(options.headers)
      .reduce((prev, next) => Object.assign(prev, {
        [next.toLowerCase()]: options.headers[next]
      }), {})

    if (headers['x-amz-signature']) {
      return true
    }

    if ([].concat(headers['authorization']).some(startsWith('AWS4-HMAC-SHA256'))) {
      return true
    }
  }

  return options.path && options.path.toLowerCase().indexOf('x-amz-signature=') !== -1
}

function getServiceName (tracer, config, options) {
  if (config.splitByDomain) {
    return getHost(options)
  } else if (config.service) {
    return config.service
  }

  return `${tracer._service}-http-client`
}

function addResponseHeaders (res, span, config) {
  config.headers.forEach(key => {
    const value = res.headers[key]

    if (value) {
      span.setTag(`${HTTP_RESPONSE_HEADERS}.${key}`, value)
    }
  })
}

function addRequestHeaders (req, span, config) {
  config.headers.forEach(key => {
    const value = req.getHeader(key)

    if (value) {
      span.setTag(`${HTTP_REQUEST_HEADERS}.${key}`, value)
    }
  })
}

function getHost (options) {
  if (typeof options === 'string') {
    return url.parse(options).host
  }

  const hostname = options.hostname || options.host || 'localhost'
  const port = options.port

  return [hostname, port].filter(val => val).join(':')
}

function startsWith (searchString) {
  return value => String(value).startsWith(searchString)
}

function normalizeConfig (config) {
  debugger;
  config = config.client || config

  const validateStatus = getStatusValidator(config)
  const propagationFilter = getFilter({ blocklist: config.propagationBlocklist })
  const headers = getHeaders(config)
  const hooks = getHooks(config)

  return Object.assign({}, config, {
    validateStatus,
    propagationFilter,
    headers,
    hooks
  })
}
  
function getStatusValidator (config) {
  if (typeof config.validateStatus === 'function') {
    return config.validateStatus
  } else if (config.hasOwnProperty('validateStatus')) {
    log.error('Expected `validateStatus` to be a function.')
  }
  return code => code < 400 || code >= 500
}

function getFilter (config) {
  config = Object.assign({}, config, {
    blocklist: config.blocklist || []
  })

  return urlFilter.getFilter(config)
}

function getHeaders (config) {
  if (!Array.isArray(config.headers)) return []

  return config.headers
    .filter(key => typeof key === 'string')
    .map(key => key.toLowerCase())
}

function getHooks (config) {
  const noop = () => {}
  const request = (config.hooks && config.hooks.request) || noop

  return { request }
}

module.exports = HttpPlugin
