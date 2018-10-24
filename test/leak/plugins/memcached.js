'use strict'

require('../../..')
  .init({ plugins: false, sampleRate: 0 })
  .use('memcached')

const test = require('tape')
const Memcached = require('memcached')
const profile = require('../../profile')

test('memcached plugin should not leak', t => {
  const memcached = new Memcached('localhost:11233', { retries: 0 })

  profile(t, operation).then(() => memcached.end())

  function operation (done) {
    memcached.get('foo', done)
  }
})
