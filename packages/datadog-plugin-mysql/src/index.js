'use strict'

const Plugin = require('../../dd-trace/src/plugins/plugin')
const { storage } = require('../../datadog-core')
const analyticsSampler = require('../../dd-trace/src/analytics_sampler')

class MYSQLPlugin extends Plugin {
  static get name () {
    return 'mysql'
  }

  constructor (...args) {
    super(...args)

    this.addSub('apm:mysql:query:start', () => {
      const store = storage.getStore()
      const childOf = store ? store.span : store
      const span = this.tracer.startSpan('mysql.query', {
        childOf,
        tags: {
          // [this.Tags.SPAN_KIND]: this.Tags.SPAN_KIND_RPC_CLIENT,
          'service.name': this.config.service || `${this.tracer._service}-mysql`,
          'span.type': 'sql',
          'span.kind': 'client',
          'db.type': 'mysql',
          'db.user': this.config.user,
          'out.host': this.config.host,
          'out.port': this.config.port
        }
      })
      // console.log('we are in the spannnn')
      // console.log(span)
      analyticsSampler.sample(span, this.config.measured)
      this.enter(span, store)
      // console.log('we are in the subbbb')
      // console.log(store)
    })

    this.addSub('apm:mysql:query:end', () => {
      console.log('1')
      // this.exit()
      
      this.exit()
      // console.log(this.tracer.scope().active())
    })

    this.addSub('apm:mysql:query:error', err => {
      console.log('3')
      const span = storage.getStore().span
      span.setTag({
        'error.type': err.name,
        'error.msg': err.message,
        'error.stack': err.stack
      })
    })

    this.addSub('apm:mysql:query:async-end', () => {
      console.log('4')
      // console.log(this.tracer.scope().active())
      console.log(storage.getStore())
      storage.getStore().span.finish()
    })
  }
}

module.exports = MYSQLPlugin
