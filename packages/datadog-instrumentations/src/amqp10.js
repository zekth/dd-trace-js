'use strict'

const { AsyncResource } = require('async_hooks')
const {
  channel,
  addHook,
  bind,
  bindAsyncResource
} = require('./helpers/instrument')
const shimmer = require('../../datadog-shimmer')

addHook({
  name: 'amqp10',
  file: 'lib/sender_link.js',
  versions: ['>=3']
}, (SenderLink) => {
  const startCh = channel('apm:amqp10:send:start')
  const endCh = channel('apm:amqp10:send:end')
  const asyncEndCh = channel('apm:amqp10:send:async-end')
  const errorCh = channel('apm:amqp10:send:error')

  shimmer.wrap(SenderLink.prototype, 'send', send => {
    return function sendWithTrace (msg, options) {
      if (!startCh.hasSubscribers) {
        return send.apply(this, arguments)
      }
      const address = getAddress(this)
      const target = getShortName(this)

      try {
        startCh.publish({ address, target, link: this })
        const promise = send.apply(this, arguments)
        endCh.publish(undefined)

        return wrapPromise(promise)
      } catch (e) {
        finish(e)
        throw e
      }
    }
  })

  return SenderLink

  function finish (error) {
    if (error) {
      errorCh.publish(error)
    }

    asyncEndCh.publish(undefined)
  }

  function wrapPromise (promise) {
    if (!promise) {
      finish()
      return promise
    }

    promise.then(() => finish(), finish)

    return promise
  }
})

addHook({
  name: 'amqp10',
  file: 'lib/receiver_link.js',
  versions: ['>=3']
}, (ReceiverLink) => {
  const startCh = channel('apm:amqp10:receive:start')
  const endCh = channel('apm:amqp10:receive:end')

  shimmer.wrap(ReceiverLink.prototype, '_messageReceived', messageReceived => {
    return function messageReceivedWithTrace (transferFrame) {
      if (!startCh.hasSubscribers || !transferFrame || transferFrame.aborted || transferFrame.more) {
        return messageReceived.apply(this, arguments)
      }
      const source = getShortName(this)
      const address = getAddress(this)

      startCh.publish({ source, address, link: this })
      messageReceived.apply(this, arguments)
      endCh.publish()
    }
  })

  return ReceiverLink
})

function getShortName (link) {
  if (!link || !link.name) return null

  return link.name.split('_').slice(0, -1).join('_')
}

function getAddress (link) {
  if (!link || !link.session || !link.session.connection) return {}

  return link.session.connection.address || {}
}
