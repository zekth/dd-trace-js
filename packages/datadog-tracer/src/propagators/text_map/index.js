'use strict'

const { DatadogPropagator } = require('./datadog')
const { B3Propagator } = require('./b3')

class TextMapPropagator {
  constructor (config) {
    this._config = config
    this._datadog = new DatadogPropagator()
    this._b3 = undefined
  }

  inject (span, carrier) {
    this._datadog.inject(span, carrier)

    if (this._config.b3) {
      this._b3 = this._b3 || new B3Propagator()
      this._b3.inject(span, carrier)
    }
  }

  extract (carrier) {
    const datadogContext = this._datadog.extract(carrier)

    if (!datadogContext && this._config.b3) {
      this._b3 = this._b3 || new B3Propagator()

      return this._b3.extract(carrier)
    }

    return datadogContext
  }
}

module.exports = { TextMapPropagator }
