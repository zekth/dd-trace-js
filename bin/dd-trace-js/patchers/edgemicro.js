'use strict'

const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync

function patchEdgemicro () {
  const main = getMain()

  if (!main) {
    throw new Error('Could not resolve "edgemicro". Is it installed at the same level as the tracer?')
  }

  const original = main.replace(/^(.*)\.js$/, `$1.original.js`)
  const override = path.join(__dirname, 'edgemicro.tpl.js')
    .replace('{ORIGINAL}', original)
    .replace('{TRACER}', `${__dirname}/../../..`)

  if (!fs.existsSync(original)) {
    fs.writeFileSync(original, fs.readFileSync(main))
  }

  fs.writeFileSync(main, fs.readFileSync(override))
}

function getMain () {
  return resolveLocal() || resolveGlobal()
}

function resolveLocal () {
  return resolve('edgemicro')
}

function resolveGlobal () {
  const path = execSync('npm root -g')
    .toString()
    .trim()

  return resolve('edgemicro', [path])
}

function resolve (name, paths) {
  try {
    return require.resolve(name, { paths })
  } catch (e) {
    return null
  }
}

module.exports = patchEdgemicro
