'use strict'

const Plugin = require('../../dd-trace/src/plugins/plugin')
const { storage } = require('../../datadog-core')
const analyticsSampler = require('../../dd-trace/src/analytics_sampler')
const FORMAT_HTTP_HEADERS = require('opentracing').FORMAT_HTTP_HEADERS
const tags = require('../../../ext/tags')
const types = require('../../../ext/types')
const kinds = require('../../../ext/kinds')
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

const HTTP2_HEADER_AUTHORITY = ':authority'
const HTTP2_HEADER_SCHEME = ':scheme'
const HTTP2_HEADER_PATH = ':path'

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
        // span = web.startChildSpan(tracer, name, req.headers)

        const temp = store ? store.span : store
        const ext = this.tracer.extract('http_headers', req.headers)
        const childOf = temp || ext
        span = this.tracer.startSpan('http.request', { childOf })
      }

      debugger;
      req._datadog.tracer = this.tracer
      req._datadog.span = span
      req._datadog.res = res
      // const ddObj = req._datadog
      // ddObj.tracer = this.tracer
      // ddObj.span = span
      // ddObj.res = res

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
      this.exit()
    })

    this.addSub('apm:http:request:error', err => {
      if (err) {
        const span = storage.getStore().span
        span.setTag('error', err)
      }
    })

    this.addSub('apm:http:request:async-end', ([req]) => {
      const span = storage.getStore().span

      if (req._datadog.finished && !req.stream) return

      const res = req._datadog.res

      span.addTags({
        [HTTP_URL]: url.split('?')[0],
        [HTTP_METHOD]: req.method,
        [SPAN_KIND]: SERVER,
        [SPAN_TYPE]: WEB
      })

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

      if (req._datadog.paths.length > 0) {
        span.setTag(HTTP_ROUTE, req._datadog.paths.join(''))
      }
    
      span.addTags({
        [HTTP_STATUS_CODE]: res.statusCode
      })

      // const span = req._datadog.span
      const error = req._datadog.error

      if (!req._datadog.config.validateStatus(res.statusCode)) {
        span.setTag(ERROR, error || true)
      }

      req._datadog.config.hooks.request(req._datadog.span, req, res)


      span.finish()

      req._datadog.finished = true
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

module.exports = HttpPlugin
