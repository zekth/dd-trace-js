'use strict'

const msgpack = require('msgpack-lite')

const codec = msgpack.createCodec({ preset: true })

module.exports = {
  msgpack: () => (req, res, next) => {
    const decodeStream = msgpack.createDecodeStream({ codec })

    req.pipe(decodeStream)
      .on('data', body => {
        req.body = body
        next()
      })
  }
}
