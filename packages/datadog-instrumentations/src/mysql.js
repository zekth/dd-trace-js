'use strict'

const { AsyncResource } = require('async_hooks')
const {
  channel,
  addHook,
  bind,
  bindAsyncResource
} = require('./helpers/instrument')
const shimmer = require('../../datadog-shimmer')

addHook({ name: 'mysql', file: 'lib/Connection.js', versions: ['>=2'] }, Connection => {
  const startCh = channel('apm:mysql:query:start')
  const startWithArgsCh = channel('apm:mysql:query:with-args')
  const asyncEndCh = channel('apm:mysql:query:async-end')
  const endCh = channel('apm:mysql:query:end')
  const errorCh = channel('apm:mysql:query:error')

  console.log('yessirrr')

  shimmer.wrap(Connection.prototype, 'query', wrapThen)
  
  // same as wrap function
  // shimmer.wrap(Connection.prototype, 'query', command => function (sql, values, cb) {
  //   if (!startCh.hasSubscribers) {
  //     return command.apply(this, arguments)
  //   }

  //   const asyncResource = new AsyncResource('bound-anonymous-fn')

  //   const client = this


  //   // // dont neeed query compiler
  //   // const wrappedQueryCompiler = function () {
  //   //   const query = queryCompiler.apply(this, arguments)
  //   //   const callback = bindAsyncResource.call(asyncResource, query.callback)

  //   //   query.callback = bind(function (err) {
  //   //     if (err) {
  //   //       errorCh.publish(err)
  //   //     }
  //   //     asyncEndCh.publish(undefined)

  //   //     return callback.apply(this, arguments)
  //   //   })
  //   //   startWithArgsCh.publish({ client, server, query })

  //   //   return query
  //   // }

  //   startCh.publish(undefined)

  //   arguments[0] = wrappedQueryCompiler

  //   const result = command.apply(this, arguments)
  //   endCh.publish(undefined)
  //   return result
  // })

  return Connection
})

addHook({ name: 'mysql', file: 'lib/Pool.js', versions: ['>=2'] }, Pool => {
  const startCh = channel('apm:mysql:getConnection:start')
  const startWithArgsCh = channel('apm:mysql:getConnection:with-args')
  const asyncEndCh = channel('apm:mysql:getConnection:async-end')
  const endCh = channel('apm:mysql:getConnection:end')
  const errorCh = channel('apm:mysql:getConnection:error')

  shimmer.wrap(Pool.prototype, 'getConnection', wrapThen)
  
  // same as wrap function
  // shimmer.wrap(Pool.prototype, 'getConnection', command => function (getConnection) {
  //   if (!startCh.hasSubscribers) {
  //     return command.apply(this, arguments)
  //   }

  //   const asyncResource = new AsyncResource('bound-anonymous-fn')

  //   const client = this


  //   // dont neeed query compiler
  //   const wrappedQueryCompiler = function () {
  //     const query = queryCompiler.apply(this, arguments)
  //     const callback = bindAsyncResource.call(asyncResource, query.callback)

  //     query.callback = bind(function (err) {
  //       if (err) {
  //         errorCh.publish(err)
  //       }
  //       asyncEndCh.publish(undefined)

  //       return callback.apply(this, arguments)
  //     })
  //     startWithArgsCh.publish({ client, server, query })

  //     return query
  //   }

  //   startCh.publish(undefined)

  //   arguments[0] = wrappedQueryCompiler

  //   const result = command.apply(this, arguments)
  //   endCh.publish(undefined)
  //   return result
  // })
  
  return Pool
})