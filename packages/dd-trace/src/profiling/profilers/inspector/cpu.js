'use strict'

class InspectorCpuProfiler {
  constructor (options = {}) {
    this._samplingInterval = options.samplingInterval || 10 * 1000
  }

  start ({ mapper }) {
    const { Session } = require('inspector')

    this._mapper = mapper

    this._session = new Session()
    this._session.connect()
    this._session.post('Profiler.enable')
    this._session.post('Profiler.setSamplingInterval', {
      interval: this._samplingInterval
    })
    this._session.post('Profiler.start')
  }

  stop () {
    this._session.post('Profiler.stop')
    this._session.post('Profiler.disable')
    this._session.disconnect()
    this._session = null

    this._mapper = null
  }

  profile () {
    return new Promise((resolve, reject) => {
      this._session.post('Profiler.stop', (err, params) => {
        if (err) return reject(err)

        this._session.post('Profiler.start')

        resolve(params.profile)
      })
    })
  }
}

module.exports = { InspectorCpuProfiler }
