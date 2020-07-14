'use strict'

const { fork } = require('child_process')

const server = fork(__dirname + '/server.js')

process.env.ITERATIONS = process.env.ITERATIONS || 100000
process.env.DD_TRACE_STARTUP_LOGS = false

timeOne('old', () => {
  timeOne('new', () => {
    timeOne('old', () => {
      timeOne('new', () => {
        timeOne('old', () => {
          timeOne('new', () => {
            server.kill()
          })
        })
      })
    })
  })
})


function timeOne (name, cb) {
  console.time(name)
  fork(__dirname + `/${name}.js`, { stdio: 'inherit' }).on('exit', () => {
    console.timeEnd(name)
    cb()
  })
}
