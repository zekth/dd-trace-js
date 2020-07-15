'use strict'

const strings = require('./strings')
strings.init(1024)

const { fork } = require('child_process')
const util = require('util')

if (!process.channel) {
  const net = require('net')
  const Decoder = require('./decoder')
  const decoder = new Decoder()
  const server = net.createServer(socket => socket.pipe(decoder)).listen(3117, () => {
    const child = fork(__filename, { stdio: 'inherit' })
    child.on('exit', () => {
      server.close()
      console.log('decoded:', util.inspect(decoder.seen, false, Infinity, true))
    })
  })
} else {
  const Writer = require('./writer')
  const Process = require('./process')
  const Trace = require('./trace')
  const Span = require('./span')
  Writer.createWriter({
    protocol: 'tcp', hostname: 'localhost', port: 3117
  }, (err, writer) => {
    if (err) {
      console.log('could not connect in child:')
      throw err
    }
    const proc = new Process()
    const trace = new Trace()
    const span1 = new Span({ trace })
    span1.name = 'span1'
    span1.service = 'service1'
    span1.type = 'type1'
    span1.resource = 'resource1'
    span1.addMeta('meta1', 'hello')
    const span2 = new Span({ trace, parent: span1 })
    span2.name = 'span2'
    span2.service = 'service2'
    span2.type = 'type2'
    span2.resource = 'resource2'
    span2.addMetric('metric1', 1337.5)
    span2.error = true
    span1.finish()
    span2.finish()
    logAndSend(writer, proc)
    logAndSend(writer, trace)
    logAndSend(writer, span1)
    logAndSend(writer, span2)
    writer.netClient.end()
  })
}

function logAndSend (writer, thing) {
  console.log('sending:', thing.constructor.name, util.inspect(thing, false, Infinity, true))
  writer.write(thing)
}
