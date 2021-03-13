'use strict'

class InspectorHeapProfiler {
  constructor (options = {}) {
    this._samplingInterval = options.samplingInterval || 512 * 1024
  }

  start ({ mapper }) {
    const { Session } = require('inspector')

    this._mapper = mapper

    this._session = new Session()
    this._session.connect()
    this._session.post('HeapProfiler.enable')
    this._session.post('HeapProfiler.startSampling', {
      samplingInterval: this._samplingInterval
    })
  }

  stop () {
    this._session.post('HeapProfiler.stopSampling')
    this._session.post('HeapProfiler.disable')
    this._session.disconnect()
    this._session = null

    this._mapper = null
  }

  profile () {
    return new Promise((resolve, reject) => {
      this._session.post('HeapProfiler.getSamplingProfile', (err, params) => {
        if (err) return reject(err)

        resolve(params.profile)
      })
    })
  }
}

module.exports = { InspectorHeapProfiler }
