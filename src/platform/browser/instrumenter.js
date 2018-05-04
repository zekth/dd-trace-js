'use strict'

class Instrumenter {
  use (name, config) {}

  patch (config) {}

  unpatch () {}

  reload () {}
}

module.exports = tracer => new Instrumenter(tracer)
