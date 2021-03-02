'use strict'
const path = require('path')
const jsYaml = require('js-yaml')

const dir = process.argv[2]
const meta = require(path.join(__dirname, dir, 'meta.json'))

const yaml = {
  version: '3.9',
  services: {
    [meta.name]: {
      volumes: [
        `${path.resolve(__dirname, '../..')}:/app`
      ],
      build: {
        context: '.',
        args: {
          vcsref: process.env.GIT_COMMIT_HASH,
          app_dir: dir
        }
      }
    }
  }
}

for (const [name, config] of Object.entries(meta.images)) {
  const serviceYaml = {
    image: config.image || name
  }
  if (config.env) {
    serviceYaml.environment = config.env
  }
  if (config.ports) {
    serviceYaml.ports = config.ports
  }
  yaml.services[name] = serviceYaml
  yaml.services[meta.name].depends_on = yaml.services[meta.name].depends_on || []
  yaml.services[meta.name].depends_on.push(name)
}

console.log(jsYaml.dump(yaml))
