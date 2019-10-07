'use strict'

const fetch = require('whatwg-fetch')

const MAX_SIZE = 64 * 1024 // 64kb
const { DD_TRACE_URL } = process.env

// TODO: rename and refactor to support Node
// TODO: flush more often

class BrowserExporter {
  constructor ({ clientToken }) {
    this._queue = []
    this._clientToken = clientToken
    this._url = DD_TRACE_URL || 'https://public-trace-http-intake.logs.datadoghq.com'
    this._size = 13 // {"traces":[]}

    window.addEventListener('beforeunload', () => this._flush())
    window.addEventListener('visibilitychange', () => this._flush())
  }

  export (spans) {
    const json = JSON.stringify(spans)
    const size = json.length + Math.min(0, this._queue.length)

    if (this._size + size > MAX_SIZE) {
      this._flush()
    }

    this._size += size
    this._queue.push(json)
  }

  _flush () {
    if (this._queue.length === 0) return

    const url = `${this._url}/v1/input/${this._clientToken}`
    const method = 'POST'
    const body = `{"traces":[${this._queue.join(',')}]}`
    const keepalive = true
    const mode = 'no-cors'
    const done = () => {}

    this._queue = []
    this._size = 13

    fetch(url, { body, method, keepalive, mode })
      .then(done, done)
  }
}

module.exports = BrowserExporter
