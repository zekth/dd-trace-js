'use strict'

const Plugin = require('../../dd-trace/src/plugins/plugin')
const { storage } = require('../../datadog-core')
const analyticsSampler = require('../../dd-trace/src/analytics_sampler')
const web = require('../../dd-trace/src/plugins/util/web')
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

      // span = storage.getStore().span
      // span.finish()
    })

    this.addSub('apm:http:request:async-end2', ([req, res]) => {
      debugger;
      web.finish(req, res)
      // const span = storage.getStore().span
      // span.finish()
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
