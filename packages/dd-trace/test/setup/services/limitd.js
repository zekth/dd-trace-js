'use strict'

const RetryOperation = require('../operation')
const LimitdClient = require('../../../../../versions/limitd-client').get()

function waitForLimitd () {
  return new Promise((resolve, reject) => {
    const operation = new RetryOperation('limitd', {
      retries: 180
    })

    setImmediate(() => {
      operation.attempt(currentAttempt => {
        const limitd = new LimitdClient('limitd://localhost:9231')
        limitd.ping(err => {
          limitd.disconnect()
          if (operation.retry(err)) return
          if (err) return reject(err)

          limitd.disconnect()

          resolve()
        })
      })
    })
  })
}

module.exports = waitForLimitd
