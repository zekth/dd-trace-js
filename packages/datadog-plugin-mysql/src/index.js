'use strict'

const Plugin = require('../../dd-trace/src/plugins/plugin')
const { storage } = require('../../datadog-core')
const analyticsSampler = require('../../dd-trace/src/analytics_sampler')

class MYSQLPlugin extends Plugin {
  static get name () {
    return 'mysql'
  }

  addSubs (func, start, asyncEnd = defaultAsyncEnd) {
    this.addSub(`apm:mysql:${func}:start`, start)
    this.addSub(`apm:mysql:${func}:end`, this.exit.bind(this))
    this.addSub(`apm:mysql:${func}:error`, errorHandler)
    this.addSub(`apm:mysql:${func}:async-end`, asyncEnd)
  }

  startSpan (name, customTags, store) {
    const tags = {
      'service.name': this.config.service || this.tracer._service,
      'span.kind': 'client'
    }
    for (const tag in customTags) {
      tags[tag] = customTags[tag]
    }
    const span = this.tracer.startSpan(name, {
      childOf: store ? store.span : null,
      tags
    })
    analyticsSampler.sample(span, this.config.measured)
    return span
  }

  constructor (...args) {
    super(...args)

    this.addSubs('query', ([hostname]) => {
      const store = storage.getStore()
      const span = this.startSpan('mysql.query', {
        'resource.name': hostname,
        'dns.hostname': hostname
      }, store)
      this.enter(span, store)
    }, (result) => {
      const { span } = storage.getStore()
      span.setTag('dns.address', result)
      span.finish()
    })

    this.addSubs('getConnection', ([address, port]) => {
      const store = storage.getStore()
      const span = this.startSpan('mysql.getConnection', {
        'resource.name': `${address}:${port}`,
        'dns.address': address,
        'dns.port': port
      }, store)
      this.enter(span, store)
    })
  }
}

function defaultAsyncEnd () {
  storage.getStore().span.finish()
}

function errorHandler (error) {
  storage.getStore().addError(error)
}

module.exports = MYSQLPlugin