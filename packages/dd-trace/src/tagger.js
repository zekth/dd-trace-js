'use strict'

const log = require('./log')

function add (carrier, keyValuePairs) {
  if (!carrier || !keyValuePairs) return

  if (typeof keyValuePairs === 'string') {
    keyValuePairs = keyValuePairs
      .split(',')
      .filter(tag => tag.indexOf(':') !== -1)
      .reduce((prev, next) => {
        const tag = next.split(':')
        const key = tag[0]
        const value = tag.slice(1).join(':')

        prev[key] = value

        return prev
      }, {})
  }

  if (Array.isArray(keyValuePairs)) {
    for (const tags of keyValuePairs) {
      add(carrier, tags)
    }
  }

  try {
    for (const key in keyValuePairs) {
      carrier[key] = keyValuePairs[key]
    }
  } catch (e) {
    log.error(e)
  }
}

module.exports = { add }
