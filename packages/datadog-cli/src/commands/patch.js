'use strict'

/* eslint-disable no-console */

const all = ['edgemicro']

function patch ({ name }) {
  const names = name === '*' ? all : name.split(',').filter(name => all.includes(name))

  for (const name of names) {
    const patcher = require(`../patchers/${name}`)

    try {
      patcher.patch()
      console.log(`Patched "${name}" successfully.`)
    } catch (e) {
      console.error(e.message)
    }
  }
}

module.exports = patch
