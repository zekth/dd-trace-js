'use strict'

/* eslint-disable no-console */

function patch ({ name }) {
  const patchers = name === '*'
    ? ['edgemicro']
    : [].concat(name.split(','))

  for (const name of patchers) {
    const patcher = getPatcher(name)

    if (!patcher) {
      return console.log(`Skipping patch "${name}" which could not be found.`)
    }

    try {
      patcher()
      console.log(`Patched "${name}" successfully.`)
    } catch (e) {
      console.error(e.message)
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
