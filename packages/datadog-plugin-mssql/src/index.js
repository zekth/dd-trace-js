'use strict'

const Tags = require('opentracing').Tags
const analyticsSampler = require('../../dd-trace/src/analytics_sampler')

function createWrapFunc (tracer, config) {
  return function wrapFunc (func) {
    return function funcWithTrace (command, callback) {
      const connectionConfig = this.parent.config
      const scope = tracer.scope()
      const childOf = scope.active()
      const span = tracer.startSpan('mssql.query', {
        childOf,
        tags: {
          [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_CLIENT,
          'service.name': config.service || `${tracer._service}-mssql`,
          'resource.name': command,
          'span.type': 'sql',
          'db.type': 'mssql',
          'db.user': connectionConfig.user,
          'out.host': connectionConfig.server,
          'out.port': connectionConfig.port
        }
      })

      if (connectionConfig.database) {
        span.setTag('db.name', connectionConfig.database)
      }

      analyticsSampler.sample(span, config.analytics)

      const res = func.call(this, command, wrapCallback(tracer, span, childOf, callback))

      span.finish()
      return res
    }
  }
}

function wrapCallback (tracer, span, parent, callback) {
  return function (err) {
    if (err) {
      span.addTags({
        'error.type': err.name,
        'error.msg': err.message,
        'error.stack': err.stack
      })
    }

    span.finish()
    return callback.apply(null, arguments)
  }
}

module.exports = [
  {
    name: 'mssql',
    file: 'lib/base.js',
    versions: ['>=4'],
    patch (mssql, tracer, config) {
      this.wrap(mssql.Request.prototype, '_query', createWrapFunc(tracer, config))
      this.wrap(mssql.Request.prototype, '_execute', createWrapFunc(tracer, config))
      this.wrap(mssql.Request.prototype, '_batch', createWrapFunc(tracer, config))
    },
    unpatch (mssql, tracer, config) {
      this.unwrap(mssql.Request.prototype, '_query')
      this.unwrap(mssql.Request.prototype, '_execute')
      this.unwrap(mssql.Request.prototype, '_batch')
    }
  }
]
