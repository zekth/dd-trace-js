'use strict'

const ITERATIONS = process.env.ITERATIONS

const Writer = require('../writer')
const Process = require('../process')
const Trace = require('../trace')
const Span = require('../span')

require('../strings').init(1024)

Writer.createWriter({
  protocol: 'tcp', hostname: 'localhost', port: 3117
}, (err, writer) => {
  if (err) {
    console.log('could not connect in child:')
    throw err
  }
  const proc = new Process()
  for (let i = 0; i < ITERATIONS; i++) {
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
    writer.write(proc)
    writer.write(trace)
    writer.write(span1)
    writer.write(span2)
  }
  writer.netClient.end()
  process.exit()
})
