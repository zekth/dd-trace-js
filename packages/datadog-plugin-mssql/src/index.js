'use strict'

const Tags = require('opentracing').Tags
const analyticsSampler = require('../../dd-trace/src/analytics_sampler')

function createWrapFunc (tracer, config, name) {
  return function wrapFunc (func) {
    return function funcWithTrace (command, callback) {
      const connectionConfig = this.parent.config
      const scope = tracer.scope()
      const childOf = scope.active()
      const span = tracer.startSpan(`mssql.${name}`, {
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

      const res = scope.bind(func, span).call(this, command, wrapCallback(tracer, span, childOf, callback))

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
    if (callback) {
      return tracer.scope().activate(parent, () => callback.apply(this, arguments))
    }
  }
}

module.exports = [
  {
    name: 'mssql',
    file: 'lib/tedious.js',
    versions: ['>=4'],
    patch (tedious, tracer, config) {
      this.wrap(tedious.Request.prototype, '_query', createWrapFunc(tracer, config, 'query'))
      this.wrap(tedious.Request.prototype, '_execute', createWrapFunc(tracer, config, 'execute'))
      this.wrap(tedious.Request.prototype, '_batch', createWrapFunc(tracer, config, 'batch'))
    },
    unpatch (tedious, tracer, config) {
      this.unwrap(tedious.Request.prototype, '_query')
      this.unwrap(tedious.Request.prototype, '_execute')
      this.unwrap(tedious.Request.prototype, '_batch')
    }
  },
  {
    name: 'mssql',
    file: 'lib/msnodesqlv8.js',
    versions: ['>=4'],
    patch (msnodesqlv8, tracer, config) {
      this.wrap(msnodesqlv8.Request.prototype, '_query', createWrapFunc(tracer, config, 'query'))
      this.wrap(msnodesqlv8.Request.prototype, '_execute', createWrapFunc(tracer, config, 'execute'))
      this.wrap(msnodesqlv8.Request.prototype, '_batch', createWrapFunc(tracer, config, 'batch'))
    },
    unpatch (msnodesqlv8, tracer, config) {
      this.unwrap(msnodesqlv8.Request.prototype, '_query')
      this.unwrap(msnodesqlv8.Request.prototype, '_execute')
      this.unwrap(msnodesqlv8.Request.prototype, '_batch')
    }
  }
]
