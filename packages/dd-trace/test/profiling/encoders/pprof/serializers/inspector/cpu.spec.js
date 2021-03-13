'use strict'

const { expect } = require('chai')

describe('profiling/encoders/pprof/serializers/inspector/cpu', () => {
  let InspectorCpuProfiler
  let CpuProfileSerializer
  let mapper
  let serializer
  let profiler

  beforeEach(() => {
    InspectorCpuProfiler = require('../../../../../../src/profiling/profilers/inspector/cpu').InspectorCpuProfiler
    CpuProfileSerializer = require('../../../../../../src/profiling/encoders/pprof/serializers/inspector/cpu')
      .CpuProfileSerializer

    mapper = { getSource: callFrame => Promise.resolve(callFrame) }
    profiler = new InspectorCpuProfiler()
    serializer = new CpuProfileSerializer()
  })

  afterEach(() => {
    profiler.stop()
  })

  it('should serialize profiles in the correct format', async () => {
    profiler.start({ mapper })

    const profile = await profiler.profile()

    expect(serializer.serialize(profile)).to.be.a.profile
  })

  it('should skip redundant samples', done => {
    profiler.start({ mapper })

    setTimeout(async () => {
      try {
        const profile = serializer.serialize(await profiler.profile())

        const stringTable = profile.stringTable
        const programFunction = profile.function
          .find(fn => stringTable[fn.name] === '(program)')
        const programLocations = profile.location
          .filter(location => location.line[0].functionId === programFunction.id)
        const programLocationIds = new Set(programLocations.map(loc => loc.id))
        const programSamples = profile.sample
          .filter(sample => programLocationIds.has(sample.locationId[0]))

        expect(programSamples).to.be.empty

        done()
      } catch (e) {
        done(e)
      }
    }, 100)
  })
})
