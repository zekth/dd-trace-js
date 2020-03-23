'use strict'

/* eslint-disable no-console */

const all = ['edgemicro']

function unpatch ({ name }) {
  const names = name === '*' ? all : name.split(',').filter(name => all.includes(name))

  for (const name of names) {
    const patcher = require(`../patchers/${name}`)

    try {
      patcher.unpatch()
      console.log(`Unpatched "${name}" successfully.`)
    } catch (e) {
      console.error(e.message)
    }
  }
}

module.exports = unpatch
