'use strict'

const RetryOperation = require('../operation')
const mssql = require('../../../../../versions/mssql').get()

function waitForMysql () {
  return new Promise((resolve, reject) => {
    const operation = new RetryOperation('mssql')

    operation.attempt(currentAttempt => {
      const connection = mssql.connect({
        server: 'localhost',
        user: 'root',
        password: 'DD_HUNTER2'
      }, (err) => {
        if (operation.retry(err)) return
        if (err) return reject(err)
        connection.end(() => resolve())
      })
    })
  })
}

module.exports = waitForMysql
