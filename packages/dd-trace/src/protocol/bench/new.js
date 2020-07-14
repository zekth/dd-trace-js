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
    span1.setName('span1')
    span1.setService('service1')
    span1.setType('type1')
    span1.setResource('resource1')
    span1.addMeta('meta1', 'hello')
    const span2 = new Span({ trace, parent: span1 })
    span2.setName('span2')
    span2.setService('service2')
    span2.setType('type2')
    span2.setResource('resource2')
    span2.addMetric('metric1', 1337.5)
    span2.setError(true)
    writer.write(proc)
    writer.write(trace)
    writer.write(span1)
    writer.write(span2)
  }
  writer.netClient.end()
  process.exit()
})
