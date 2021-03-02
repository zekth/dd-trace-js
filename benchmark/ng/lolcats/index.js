const http = require('http')
const udp = require('dgram')
const { monitorEventLoopDelay } = require('perf_hooks')
const h = monitorEventLoopDelay({ resolution: 5 })
h.enable()

http.get('http://hello-world-service:8080/', res => {
  if (res.statusCode !== 200) {
    throw new Error(res.statusCode)
  }
  h.disable()
  const sock = udp.createSocket('udp4')
  const string = 'min max mean stddev'.split(' ').reduce((prev, cur) => {
    return prev + `event.loop.${cur}:${h[cur]}|g\n`
  }, '')
  sock.send(string, 8125, 'localhost', () => {
    console.log('sent')
    sock.close()
  })
})
