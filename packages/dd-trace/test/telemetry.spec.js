'use strict'

const tracerVersion = require('../../../package.json').version
const proxyquire = require('proxyquire')
const requirePackageJson = require('../src/require-package-json')
const http = require('http')
const { once } = require('events')

let traceAgent

describe('telemetry', () => {
  let origSetInterval
  let telemetry
  let instrumentedMap

  before(done => {
    origSetInterval = setInterval

    global.setInterval = (fn, interval) => {
      expect(interval).to.equal(60000)
      // we only want one of these
      return setImmediate(fn)
    }

    traceAgent = http.createServer(async (req, res) => {
      try {
        const chunks = []
        for await (const chunk of req) {
          chunks.push(chunk)
        }
        req.body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        traceAgent.reqs.push(req)
        traceAgent.emit('handled-req')
        await traceAgent.handlers.shift()(req)
        res.end(() => {
          if (traceAgent.handlers.length === 0) {
            traceAgent.resolveHandled()
          }
        })
      } catch (e) {
        traceAgent.rejectHandled(e)
      }
    }).listen(0, done)

    traceAgent.reqs = []

    telemetry = proxyquire('../src/telemetry', {
      './exporters/agent/docker': {
        id () {
          return 'test docker id'
        }
      },
      os: {
        hostname () {
          return 'test hostname'
        }
      }
    })

    instrumentedMap = new Map([
      [{ name: 'foo' }, {}],
      [{ name: 'bar' }, {}]
    ])

    telemetry.start({
      telemetryEnabled: true,
      hostname: 'localhost',
      port: traceAgent.address().port,
      service: 'test service',
      version: '1.2.3-beta4',
      env: 'preprod',
      tags: {
        'runtime-id': '1a2b3c'
      }
    }, {
      _instrumented: instrumentedMap
    })
  })

  after(() => {
    telemetry.stop()
    traceAgent.close()
    global.setInterval = origSetInterval
  })

  it('should send app-started', () => {
    return testSeq(0, 'app-started', payload => {
      expect(payload).to.deep.include({
        integrations: [
          { name: 'foo', enabled: true, auto_enabled: true },
          { name: 'bar', enabled: true, auto_enabled: true }
        ],
        dependencies: getMochaDeps(),
        configuration: {
          telemetryEnabled: true,
          hostname: 'localhost',
          port: traceAgent.address().port,
          service: 'test service',
          version: '1.2.3-beta4',
          env: 'preprod',
          'tags.runtime-id': '1a2b3c'
        }
      })
    })
  })

  it('should send app-heartbeat', () => {
    return testSeq(1, 'app-heartbeat', payload => {
      expect(payload).to.deep.equal({})
    })
  })

  it('should send app-integrations-change', () => {
    instrumentedMap.set({ name: 'baz' }, {})
    telemetry.updateIntegrations()

    return testSeq(2, 'app-integrations-change', payload => {
      expect(payload).to.deep.equal({
        integrations: [
          { name: 'foo', enabled: true, auto_enabled: true },
          { name: 'bar', enabled: true, auto_enabled: true },
          { name: 'baz', enabled: true, auto_enabled: true }
        ]
      })
    })
  })

  it('should send app-closing', () => {
    process.emit('beforeExit')

    return testSeq(3, 'app-closing', payload => {
      expect(payload).to.deep.equal({})
    })
  })

  it('should do nothing when not enabled', (done) => {
    telemetry.stop()

    const server = http.createServer(() => {
      expect.fail('server should not be called')
    }).listen(0, () => {
      telemetry.start({
        telemetryEnabled: false,
        hostname: 'localhost',
        port: server.address().port
      })

      setTimeout(done, 10)
    })
  })
})

async function testSeq (seqId, reqType, validatePayload) {
  while (traceAgent.reqs.length < seqId + 1) {
    await once(traceAgent, 'handled-req')
  }
  const req = traceAgent.reqs[seqId]
  const backendHost = 'tracer-telemetry-edge.datadoghq.com'
  const backendUrl = `https://${backendHost}/api/v2/apmtelemetry`
  expect(req.method).to.equal('POST')
  expect(req.url).to.equal(backendUrl)
  expect(req.headers).to.include({
    host: backendHost,
    'content-type': 'application/json',
    'dd-telemetry-api-version': 'v1',
    'dd-telemetry-request-type': reqType
  })
  expect(req.body).to.deep.include({
    api_version: 'v1',
    request_type: reqType,
    runtime_id: '1a2b3c',
    seqId,
    application: {
      service_name: 'test service',
      env: 'preprod',
      service_version: '1.2.3-beta4',
      tracer_version: tracerVersion,
      language_name: 'nodejs',
      language_version: process.versions.node
    },
    host: {
      hostname: 'test hostname',
      container_id: 'test docker id'
    }
  })
  expect(Math.floor(Date.now() / 1000 - req.body.tracer_time)).to.equal(0)

  validatePayload(req.body.payload)
}

// Since the entrypoint file is actually a mocha script, the deps will be mocha's deps
function getMochaDeps () {
  const mochaPkgJsonFile = require.resolve('mocha/package.json')
  require('mocha') // ensure mocha is cached so we have a module to grab
  const mochaModule = require.cache[require.resolve('mocha')]
  const mochaDeps = require(mochaPkgJsonFile).dependencies
  return Object.keys(mochaDeps).map(name => ({
    name,
    version: requirePackageJson(name, mochaModule).version
  }))
}
