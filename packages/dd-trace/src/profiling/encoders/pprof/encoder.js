'use strict'

const zlib = require('zlib')
const { promisify } = require('util')
const { perftools } = require('../../../../../../protobuf/profile')
const { CpuProfileSerializer } = require('./serializers/inspector/cpu')
const { HeapProfileSerializer } = require('./serializers/inspector/heap')
const { Profile } = perftools.profiles
const gzip = promisify(zlib.gzip)

const serializers = {
  InspectorCpuProfiler: new CpuProfileSerializer(),
  InspectorHeapProfiler: new HeapProfileSerializer()
}

class Encoder {
  encode ({ output, source }) {
    return gzip(Profile.encode(serializers[source].serialize(output)).finish())
  }
}

module.exports = { Encoder }
