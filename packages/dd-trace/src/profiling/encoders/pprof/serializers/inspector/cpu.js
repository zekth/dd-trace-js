'use strict'

const { Profile } = require('../../../../profile')

class CpuProfileSerializer {
  serialize ({ startTime, endTime, nodes, samples, timeDeltas }) {
    const sampleType = [['sample', 'count'], ['wall', 'microseconds']]
    const periodType = ['wall', 'microseconds']
    const period = Math.floor((endTime - startTime) / samples.length / 1000)
    const profile = new Profile(sampleType, periodType, period)
    const skippedLocationIds = new Set()

    profile.addDuration((endTime - startTime) * 1000)

    for (const node of nodes) {
      // pprof has implicit root so skip root
      if (node.callFrame.functionName === '(root)') continue

      const { id, children, callFrame } = node
      const { functionName, url, lineNumber } = callFrame // TODO: support source maps
      const functionId = profile.addFunction(functionName, url).id
      const locationId = profile.addLocation(functionId, id, lineNumber).id

      // skip redundant samples that are handled by pprof and/or the backend
      if (functionName === '(program)' || functionName === '(idle)') {
        skippedLocationIds.add(locationId)
      }

      if (children) {
        for (const childId of children) {
          profile.addLink(locationId, childId)
        }
      }
    }

    for (let i = 0; i < samples.length; i++) {
      if (skippedLocationIds.has(samples[i])) continue

      profile.addSample(samples[i], [1, timeDeltas[i]])
    }

    return profile.export()
  }
}

module.exports = { CpuProfileSerializer }
