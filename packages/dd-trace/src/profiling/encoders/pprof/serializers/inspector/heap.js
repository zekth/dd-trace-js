'use strict'

const { Profile } = require('../../../../profile')

class HeapProfileSerializer {
  serialize ({ head, samples }) {
    const sampleType = [['space', 'bytes']]
    const periodType = ['space', 'bytes']
    const period = this._samplingInterval
    const profile = new Profile(sampleType, periodType, period)
    const nodes = head.children.slice() // pprof has implicit root so skip root

    let node

    while ((node = nodes.shift())) {
      const { id, selfSize, callFrame, children } = node
      const { functionName, url, lineNumber } = callFrame // TODO: support source maps
      const functionId = profile.addFunction(functionName, url).id
      const locationId = profile.addLocation(functionId, id, lineNumber).id

      if (children) {
        for (const child of children) {
          nodes.push(child)
          profile.addLink(locationId, child.id)
        }
      }

      if (selfSize) {
        profile.addSample(locationId, [selfSize])
      }
    }

    return profile.export()
  }
}

module.exports = { HeapProfileSerializer }
