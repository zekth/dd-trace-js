'use strict'

/* eslint-disable no-console */

function patch ({ name }) {
  const patchers = name === '*'
    ? ['edgemicro']
    : [].concat(name.split(','))

  for (const name of patchers) {
    const patcher = getPatcher(name)

    if (!patcher) {
      console.log(`Skipping patch "${name}" which could not be found.`)
      continue
    }

    try {
      patcher()
      console.log(`Patched "${name}" successfully.`)
    } catch (e) {
      throw e
    }
  }
}

function getPatcher (name) {
  try {
    return require(`./patchers/${name}`)
  } catch (e) {
    return null
  }
}

module.exports = patch
