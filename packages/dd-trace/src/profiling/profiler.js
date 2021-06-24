'use strict'

const semver = require('semver')
const { EventEmitter } = require('events')
const { Config } = require('./config')
const { SourceMapper } = require('./mapper')

class Profiler extends EventEmitter {
  constructor () {
    super()
    this._enabled = false
    this._logger = undefined
    this._config = undefined
    this._flushTimer = undefined
    this._profileTimer = undefined
  }

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
        // TODO: move this out of Profiler when restoring sourcemap support
        profiler.start({
          logger: this._logger,
          mapper
        })
      }
    } catch (e) {
      this._logger.error(e)
      this.stop()
    }

    this._capture()

    return this
  }

  stop () {
    if (!this._enabled) return

    this._enabled = false

    for (const profiler of this._config.profilers) {
      profiler.stop()
    }

    clearTimeout(this._flushTimer)
    clearTimeout(this._profileTimer)
    this._flushTimer = undefined
    this._profileTimer = undefined

    return this
  }

  _capture (timeout) {
    if (!this._enabled) return
    const { flushInterval, profileDuration } = this._config
    const start = new Date()

    if (!this._timer) {
      this._flushTimer = setTimeout(() => this._capture(), flushInterval)
      this._flushTimer.unref()

      this._profileTimer = setTimeout(() => this._collect(start), profileDuration)
      this._profileTimer.unref()
    } else {
      this._flushTimer.refresh()
      this._profileTimer.refresh()
    }
  }

  async _collect (start) {
    const end = new Date()
    const profiles = {}

    try {
      for (const profiler of this._config.profilers) {
        const profile = await profiler.profile()
        if (!profile) continue

        profiles[profiler.type] = profile
      }

      await this._submit(profiles, start, end)
    } catch (err) {
      this._logger.error(err)
      this.stop()
    }
  }

  _submit (profiles, start, end) {
    const { tags } = this._config
    const tasks = []

    for (const exporter of this._config.exporters) {
      const task = exporter.export({ profiles, start, end, tags })
        .catch(err => this._logger.error(err))

      tasks.push(task)
    }

    return Promise.all(tasks)
  }
}

module.exports = { Profiler }
