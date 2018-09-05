'use strict'

module.exports = {
  run (tracer, span, fn) {
    const scope = tracer.scopeManager().activate(span)

    try {
      fn(scope)
      return scope
    } finally {
      scope.close()
    }
  },

  bind (tracer, fn, span) {
    if (span) {
      span = span.span ? span.span() : span
    } else {
      const scope = tracer.scopeManager().active()
      span = scope && scope.span()
    }

    return function () {
      const scope = tracer.scopeManager().activate(span)

      try {
        return fn.apply(this, arguments)
      } finally {
        scope.close()
      }
    }
  }
}
