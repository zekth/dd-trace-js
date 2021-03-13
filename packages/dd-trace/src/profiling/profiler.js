'use strict'

const semver = require('semver')
const { EventEmitter } = require('events')
const { Config } = require('./config')
const { SourceMapper } = require('./mapper')

class Profiler extends EventEmitter {
  start (options) {
    if (this._enabled) return

    const config = this._config = new Config(options)

    if (!config.enabled) return

    this._logger = config.logger

    if (!semver.satisfies(process.version, '>=10.12')) {
      this._logger.error('Profiling could not be started because it requires Node >=10.12')
      return this
    }

    this._enabled = true

    try {
      const mapper = config.sourceMap ? new SourceMapper() : null

      for (const profiler of config.profilers) {
        profiler.start({ mapper }) // TODO: move this outside of profilers
      }
    } catch (e) {
      this._logger.error(e)
      this.stop()
    }

    this._capture(config.flushInterval)

    return this
  }

  stop () {
    if (!this._enabled) return

    this._enabled = false

    for (const profiler of this._config.profilers) {
      profiler.stop()
    }

    clearTimeout(this._timer)

    return this
  }

  _capture (timeout) {
    const start = new Date()

    this._timer = setTimeout(() => this._collect(start), timeout)
    this._timer.unref()
  }

  async _collect (start) {
    const end = new Date()
    const profilers = this._config.profilers

    try {
      const profiles = await Promise.all(profilers.map(async profiler => ({
        output: await profiler.profile(),
        source: profiler.constructor.name
      })))

      this._capture(this._config.flushInterval)
      this._submit(profiles, start, end)
    } catch (e) {
      this._logger.error(e)
      this.stop()
    }
  }

  _submit (profiles, start, end) {
    const { tags } = this._config

    for (const exporter of this._config.exporters) {
      exporter.export({ profiles, start, end, tags })
        .catch(err => {
          this._logger.error(err)
        })
    }
  }
}

module.exports = { Profiler }
