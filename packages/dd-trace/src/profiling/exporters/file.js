'use strict'

const fs = require('fs')
const { promisify } = require('util')
const { Encoder } = require('../encoders/pprof/encoder')
const writeFile = promisify(fs.writeFile)

class FileExporter {
  constructor () {
    this._encoder = new Encoder()
  }

  export ({ profiles }) {
    return Promise.all(profiles.map((profile, i) => {
      return writeFile(`${i}.pb.gz`, this._encoder.encode(profile))
    }))
  }
}

module.exports = { FileExporter }
