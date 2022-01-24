'use strict'

const Plugin = require('../../dd-trace/src/plugins/plugin')
const { storage } = require('../../datadog-core')
const analyticsSampler = require('../../dd-trace/src/analytics_sampler')

module.exports = class Amqp10Plugin extends Plugin {
  static get name () {
    return 'amqp10'
  }

  constructor (...args) {
    super(...args)

    this.addSub('apm:amqp10:send:start', ({ address, target, link }) => {
      const span = this.startSpan('amqp.send', {
        'resource.name': ['send', target].filter(v => v).join(' '),
        'span.kind': 'producer',
        'amqp.link.target.address': target,
        'amqp.link.role': 'sender',
        'out.host': address.host,
        'out.port': address.port,
        'service.name': this.config.service || `${this.tracer._service}-amqp`,
        'amqp.link.name': link.name,
        'amqp.link.handle': link.handle,
        'amqp.connection.host': address.host,
        'amqp.connection.port': address.port,
        'amqp.connection.user': address.user
      })

      analyticsSampler.sample(span, this.config.measured)
      this.enter(span)
    })
    this.addSub('apm:amqp10:send:end', () => this.exit())
    this.addSub('apm:amqp10:send:async-end', () => {
      const { span } = storage.getStore()
      span.finish()
    })
    this.addSub('apm:amqp10:send:error', error => {
      const { span } = storage.getStore()
      span.setTag('error', error)
    })

    this.addSub('apm:amqp10:receive:start', ({ source, address, link }) => {
      const span = this.startSpan('amqp.send', {
        'resource.name': ['receive', source].filter(v => v).join(' '),
        'span.kind': 'consumer',
        'span.type': 'worker',
        'amqp.link.source.address': source,
        'amqp.link.role': 'receiver',
        'service.name': this.config.service || `${this.tracer._service}-amqp`,
        'amqp.link.name': link.name,
        'amqp.link.handle': link.handle,
        'amqp.connection.host': address.host,
        'amqp.connection.port': address.port,
        'amqp.connection.user': address.user
      })

      analyticsSampler.sample(span, this.config.measured, true)
      this.enter(span)
    })
    this.addSub('apm:amqp10:receive:end', () => this.exit())
  }

  startSpan (name, tags) {
    const store = storage.getStore()
    const childOf = store ? store.span : store

    return this.tracer.startSpan(name, { childOf, tags })
  }
}
