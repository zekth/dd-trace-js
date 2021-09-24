'use strict'

const os = require('os')
const path = require('path')
const uuid = require('crypto-randomuuid')
const requirePackageJson = require('../require-package-json')
const { getContext } = require('../gateway/engine')
const addresses = require('./addresses')
const Scheduler = require('../exporters/agent/scheduler')
const request = require('../exporters/agent/request')
const log = require('../log')

const FLUSH_INTERVAL = 2000

const host = {
  context_version: '0.1.0',
  os_type: os.type(),
  hostname: os.hostname()
}

const tracer = {
  context_version: '0.1.0',
  runtime_type: 'nodejs',
  runtime_version: process.version,
  lib_version: requirePackageJson(path.join(__dirname, '..', '..', '..', '..')).version
}

const events = new Set()

function resolveHTTPAddresses () {
  const context = getContext()

  return {
    // scheme: context.resolve(addresses.),
    // method: context.resolve(addresses.),
    url: context.resolve(addresses.HTTP_INCOMING_URL),
    // host: context.resolve(addresses.),
    // port: context.resolve(addresses.),
    // path: context.resolve(addresses.),
    // route: context.resolve(addresses.),
    remote_ip: '127.0.0.1', // context.resolve(addresses.),
    // remote_port: context.resolve(addresses.),
    // responseCode: context.resolve(addresses.),
    headers: context.resolve(addresses.HTTP_INCOMING_HEADERS)
  }
}

const HEADERS_TO_SEND = [
  'user-agent',
  'referer',
  'x-forwarded-for',
  'x-real-ip',
  'client-ip',
  'x-forwarded',
  'x-cluster-client-ip',
  'forwarded-for',
  'forwarded',
  'via'
]

function getHeadersToSend (headers) {
  const result = {}

  for (let i = 0; i < HEADERS_TO_SEND.length; ++i) {
    const headerName = HEADERS_TO_SEND[i]

    if (headers[headerName]) {
      result[headerName] = headers[headerName]
    }
  }

  return result
}

function getTracerData () {
  const scope = global._ddtrace._tracer.scope()

  const result = {
    serviceName: scope._config.service,
    serviceEnv: scope._config.env,
    serviceVersion: scope._config.version,
    tags: Object.entries(scope._config.tags).map(([k, v]) => `${k}:${v}`) // TODO: this can be optimized
  }

  const activeSpan = scope.active()

  if (activeSpan) {
    activeSpan.setTag('manual.keep')
    activeSpan.setTag('appsec.event', true)

    const context = activeSpan.context()

    result.spanId = context.toSpanId()
    result.traceId = context.toTraceId()
  }

  return result
}

function reportAttack ({
  eventType,
  blocked,
  ruleId,
  ruleName,
  ruleSet,
  matchOperator,
  matchOperatorValue,
  matchParameters,
  matchHighlight
}) {
  const resolvedHttp = resolveHTTPAddresses()

  const { spanId, traceId, serviceName, serviceEnv, serviceVersion, tags } = getTracerData()

  const event = {
    event_id: uuid(),
    event_type: eventType,
    event_version: '0.1.0',
    detected_at: (new Date()).toJSON(),
    type: ruleSet,
    blocked,
    rule: {
      id: ruleId,
      name: ruleName,
      set: ruleSet
    },
    rule_match: {
      operator: matchOperator,
      operator_value: matchOperatorValue,
      parameters: matchParameters,
      highlight: matchHighlight
    },
    context: {
      actor: {
        context_version: '0.1.0',
        ip: {
          address: resolvedHttp.remote_ip
        },
        identifiers: null,
        _id: null
      },
      host,
      http: {
        context_version: '0.1.0',
        request: {
          scheme: resolvedHttp.scheme,
          method: resolvedHttp.method,
          url: resolvedHttp.url,
          host: resolvedHttp.host,
          port: resolvedHttp.port,
          path: resolvedHttp.path,
          resource: resolvedHttp.route,
          remote_ip: resolvedHttp.remote_ip,
          remote_port: resolvedHttp.remote_port,
          headers: getHeadersToSend(resolvedHttp.headers)
        },
        response: {
          status: resolvedHttp.responseCode,
          blocked
        }
      },
      service: {
        context_version: '0.1.0',
        name: serviceName,
        environment: serviceEnv,
        version: serviceVersion
      },
      span: {
        context_version: '0.1.0',
        id: spanId
      },
      tags: {
        context_version: '0.1.0',
        values: tags
      },
      trace: {
        context_version: '0.1.0',
        id: traceId
      },
      tracer
    }
  }

  events.add(event)
}

// TODO: lock
function flush () {
  if (!events.size) return

  const eventsArray = Array.from(events.values())

  const options = {
    path: '/appsec/proxy/api/v2/appsecevts',
    method: 'POST',
    headers: {
      'X-Api-Version': 'v0.1.0',
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      protocol_version: 1,
      idempotency_key: uuid(),
      events: eventsArray
    })
  }

  const url = global._ddtrace._tracer._exporter._writer._url

  if (url.protocol === 'unix:') {
    options.socketPath = url.pathname
  } else {
    options.protocol = url.protocol
    options.hostname = url.hostname
    options.port = url.port
  }

  request(options, (err, res, status) => {
    if (err) {
      log.error(err)
    } else {
      for (let i = 0; i < eventsArray.length; ++i) {
        events.delete(eventsArray[i])
      }
    }
  })
}

const scheduler = new Scheduler(flush, FLUSH_INTERVAL)
scheduler.start()

module.exports = {
  scheduler,
  reportAttack
}