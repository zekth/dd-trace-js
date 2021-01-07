'use strict'

const { execFile } = require('child_process')
const express = require('express')
const bodyParser = require('body-parser')
const Uint64BE = require('int64-buffer').Uint64BE
const msgpack = require('msgpack-lite')
const codec = msgpack.createCodec({ int64: true })
const { expect } = require('chai')

if (require.main === module) {
  runTest()
} else {
  describe('dd-trace', () => {
    let err
    let stdout
    let stderr

    before(done => {
      execFile('node', [__filename], {

      }, (err0, stdout0, stderr0) => {
        err = err0
        stdout = stdout0
        stderr = stderr0
        done()
      })
    })

    it('should record and send a trace to the agent', () => {
      if (err) throw err
      expect(stdout.trim()).to.equal('OK')
    })
  })
}

async function runTest() {
  const agent = express()
  const listener = agent.listen()

  const tracer = require('../')

  tracer.init({
    service: 'test',
    port: listener.address().port,
    flushInterval: 0,
    plugins: false
  })

  const span = tracer.startSpan('hello', {
    tags: {
      'resource.name': '/hello/:name'
    }
  })

  agent.use(bodyParser.raw({ type: 'application/msgpack' }))
  agent.put('/v0.4/traces', (req, res) => {
    try {
      if (req.body.length === 0) return res.status(200).send()

      const payload = msgpack.decode(req.body, { codec })

      expect(payload[0][0].trace_id.toString()).to.equal(span.context()._traceId.toString(10))
      expect(payload[0][0].span_id.toString()).to.equal(span.context()._spanId.toString(10))
      expect(payload[0][0].service).to.equal('test')
      expect(payload[0][0].name).to.equal('hello')
      expect(payload[0][0].resource).to.equal('/hello/:name')
      expect(payload[0][0].start).to.be.instanceof(Uint64BE)
      expect(payload[0][0].duration).to.be.a('number')

      res.status(200).send('OK')

      listener.close()
      console.log('OK')
    } catch (e) {
      console.error(e.message)
      process.exitCode = 1
    }
    process.exit()
  })

  span.finish()
}
