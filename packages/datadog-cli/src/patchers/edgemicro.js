'use strict'

const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync

function patch () {
  const main = getMain('edgemicro')
  const tracer = getMain('dd-trace')

  const file = main.replace('/index.js', '/cli/lib/start-agent.js')
  const original = file.replace('/start-agent.js', '/start-agent.original.js')
  const template = path.join(__dirname, 'edgemicro.tpl.js')

  const agent = fs.readFileSync(file).toString()
  const override = fs.readFileSync(template).toString().replace('{TRACER}', tracer)

  if (!~agent.indexOf('dd-trace')) {
    fs.writeFileSync(original, agent)
  }

  fs.writeFileSync(file, override)
}

function unpatch () {
  const main = getMain('edgemicro')

  const file = main.replace('/index.js', '/cli/lib/start-agent.js')
  const original = file.replace('/start-agent.js', '/start-agent.original.js')

  const agent = fs.readFileSync(file).toString()

  if (~agent.indexOf('dd-trace')) {
    fs.writeFileSync(file, fs.readFileSync(original))
    fs.unlinkSync(original)
  }
}

function getMain (name) {
  const main = resolveCurrent(name) || resolveLocal(name) || resolveGlobal(name)

  if (!main) {
    throw new Error(`Could not resolve "${name}". Is it installed at the correct level?`)
  }

  return main
}

function resolveCurrent (name) {
  return resolve(name, [process.cwd()])
}

function resolveLocal (name) {
  return resolve(name)
}

function resolveGlobal (name) {
  const path = execSync('npm root -g')
    .toString()
    .trim()

  return resolve(name, [path])
}

function resolve (name, paths) {
  try {
    return require.resolve(name, { paths })
  } catch (e) {
    return null
  }
}

module.exports = { patch, unpatch }
