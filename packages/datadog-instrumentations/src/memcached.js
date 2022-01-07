'use strict'

const { AsyncResource } = require('async_hooks')
const {
  channel,
  addHook,
  bind,
  bindAsyncResource
} = require('./helpers/instrument')
const shimmer = require('../../datadog-shimmer')

addHook({ name: 'memcached', versions: ['>=2.2'] }, Memcached => {
  const startCh = channel('apm:memcached:command:start')
  const startWithArgsCh = channel('apm:memcached:command:start:with-args')
  const asyncEndCh = channel('apm:memcached:command:async-end')
  const endCh = channel('apm:memcached:command:end')
  const errorCh = channel('apm:memcached:command:error')

  // roughly the same kind of call as this.wrap
  shimmer.wrap(Memcached.prototype, 'command', command => function (queryCompiler, server) {
    if (!startCh.hasSubscribers) {
      return command.apply(this, arguments)
    }

    const asyncResource = new AsyncResource('bound-anonymous-fn')

    const client = this

    const wrappedQueryCompiler = function () {
      const query = queryCompiler.apply(this, arguments)
      const callback = bindAsyncResource.call(asyncResource, query.callback)

      query.callback = bind(function (err) {
        if (err) {
          errorCh.publish(err)
        }
        asyncEndCh.publish(undefined)

        return callback.apply(this, arguments)
      })
      startWithArgsCh.publish({ client, server, query })

      return query
    }

    startCh.publish(undefined)

    arguments[0] = wrappedQueryCompiler

    const result = command.apply(this, arguments)
    endCh.publish(undefined)
    return result
  })

  return Memcached
})
