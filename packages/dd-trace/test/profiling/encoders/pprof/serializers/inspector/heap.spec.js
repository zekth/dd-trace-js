'use strict'

const { expect } = require('chai')
const semver = require('semver')

if (!semver.satisfies(process.version, '>=10.12')) {
  describe = describe.skip // eslint-disable-line no-global-assign
}

describe('profiling/encoders/pprof/serializers/inspector/heap', () => {
  let InspectorHeapProfiler
  let HeapProfileSerializer
  let profiler
  let serializer
  let mapper

  beforeEach(() => {
    InspectorHeapProfiler = require('../../../../../../src/profiling/profilers/inspector/heap').InspectorHeapProfiler
    HeapProfileSerializer = require('../../../../../../src/profiling/encoders/pprof/serializers/inspector/heap')
      .HeapProfileSerializer

    mapper = { getSource: callFrame => Promise.resolve(callFrame) }
    profiler = new InspectorHeapProfiler()
    serializer = new HeapProfileSerializer()
  })

  afterEach(() => {
    profiler.stop()
  })

  it('should serialize profiles in the correct format', done => {
    profiler.start({ mapper })

    const obj = {}

    // heap profiler doesn't start synchronously
    setImmediate(async () => {
      // force at least the minimum sampling interval
      for (let i = 0; i < 1024 * 1024; i++) {
        obj[`${i}`] = i * 2
      }

      try {
        const profile = serializer.serialize(await profiler.profile())

        expect(profile).to.be.a.profile

        done()
      } catch (e) {
        done(e)
      }
    })
  })
})
