'use strict'

const axios = require('axios')
const msgpack = require('msgpack-lite')

const codec = msgpack.createCodec({ preset: true })

class ForwarderExporter {
  export (data) {
    const payload = msgpack.encode(data, { codec })

    // TODO: make the URL configurable
    return axios.post('http://localhost:8127/profile', payload, {
      timeout: 10 * 1000
    })
  }
}

module.exports = { ForwarderExporter }
