'use strict'

const { AsyncResource, executionAsyncId, triggerAsyncId } = require('async_hooks')
const {
  channel,
  addHook,
  bind,
  bindAsyncResource
} = require('./helpers/instrument')
const shimmer = require('../../datadog-shimmer')

addHook({ name: 'mysql', file: 'lib/Connection.js', versions: ['>=2'] }, Connection => {
  const startCh = channel('apm:mysql:query:start')
  const asyncEndCh = channel('apm:mysql:query:async-end')
  const endCh = channel('apm:mysql:query:end')
  const errorCh = channel('apm:mysql:query:error')
  
   //same as wrap function
  shimmer.wrap(Connection.prototype, 'query', query => function (sql, cb) {
    if (!startCh.hasSubscribers) {
      return query.apply(this, arguments)
    }

    const asyncResource = new AsyncResource('bound-anonymous-fn')

    
    
    // console.log(callback.asyncResource)
    const client = this
    
    
    console.log(query.callback)
    console.log(cb)
    // const temp = sql.apply(this, arguments)
    // const callback = bindAsyncResource.call(asyncResource, cb)
    // console.log(cb)
    // console.log(callback)
    // callback = bind(function (err, data){
    //   console.log(arguments)
    //   if (err) { 
    //     errorCh.publish(err)
    //   }
    //   asyncEndCh.publish(data)
    //   return callback.apply(this, arguments)
    // })

    cb = AsyncResource.bind(cb)
    console.log('grrhhh')
    console.log(cb)
    // console.log(cb)
    const startArgs = Array.from(arguments)
    startCh.publish(startArgs);

    const id = executionAsyncId()
    arguments[arguments.length - 1] = function (error, result) {
      console.log('idsssss', id, triggerAsyncId(), executionAsyncId())
      if (error) {
        errorCh.publish(error)
      }
      console.log('in callback')
      asyncEndCh.publish(result)
      cb.apply(this, arguments)
    }

    console.log('brhhhh')
    console.log(cb)
    console.log(arguments[arguments.length - 1].toString())
    try {
      return query.apply(this, arguments)
    } catch (error) {
      error.stack // trigger getting the stack at the original throwing point
      errorCh.publish(error)

      throw error
    } finally {
      endCh.publish(undefined)
    }
  })

  return Connection
})

addHook({ name: 'mysql', file: 'lib/Pool.js', versions: ['>=2'] }, Pool => {
   //same as wrap function
   shimmer.wrap(Pool.prototype, 'getConnection', getConnection => function (cb) {
    const scope = tracer.scope()

    arguments[0] = scope.bind(cb)

    return scope.bind(getConnection).apply(this, arguments)
   })
  
  return Pool
})