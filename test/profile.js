'use strict'

const memwatch = require('@airbnb/node-memwatch')

function profile (t, operation, iterations, concurrency) {
  t.plan(1)

  iterations = iterations || 1000
  concurrency = concurrency || 5

  let error = null

  const handleWarning = e => {
    if (e.name === 'MaxListenersExceededWarning') {
      error = error || e
    }
  }

  process.on('warning', handleWarning)

  const hd = new memwatch.HeapDiff()

  let count = 0
  let total = 0

  function schedule () {
    return new Promise((resolve, reject) => {
      start()

      function start () {
        setTimeout(() => {
          if (count === 0 && total === iterations * concurrency) {
            return resolve()
          }

          for (let i = count; i < concurrency; i++) {
            if (total === iterations * concurrency) {
              break
            }

            total++
            count++

            operation(() => count--)
          }

          start()
        })
      }
    })
  }

  return schedule()
    .then(() => {
      if (error) {
        log(t, error.stack)
        t.fail('event listener leak detected')
        return
      }

      const diff = hd.end()
      const leaks = diff.change.details.filter(change => {
        const max = iterations * concurrency

        return change['+'] >= max
      })

      process.removeListener('warning', handleWarning)

      if (leaks.length > 0) {
        log(t, JSON.stringify(diff, null, 2))
        t.fail('memory leak detected')
      } else {
        t.pass('no memory leak detected')
      }
    })
}

function log (t, message) {
  message.split('\n').forEach(line => {
    t.emit('result', line)
  })
}

module.exports = profile
