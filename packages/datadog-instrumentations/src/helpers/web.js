'use strict'

const url = require('url')
const log = require('../../../dd-trace/src/log')
const tags = require('../../../../ext/tags')
const kinds = require('../../../../ext/kinds')
const formats = require('../../../../ext/formats')
const urlFilter = require('../../../dd-trace/src/plugins/util/urlfilter')


exports.normalizeConfig = function normalizeConfig (config) {
  debugger;
  config = config.client || config

  const validateStatus = getStatusValidator(config)
  const propagationFilter = getFilter({ blocklist: config.propagationBlocklist })
  const headers = getHeaders(config)
  const hooks = getHooks(config)

  return Object.assign({}, config, {
    validateStatus,
    propagationFilter,
    headers,
    hooks
  })
}
  
function getStatusValidator (config) {
  if (typeof config.validateStatus === 'function') {
    return config.validateStatus
  } else if (config.hasOwnProperty('validateStatus')) {
    log.error('Expected `validateStatus` to be a function.')
  }
  return code => code < 400 || code >= 500
}

function getFilter (config) {
  config = Object.assign({}, config, {
    blocklist: config.blocklist || []
  })

  return urlFilter.getFilter(config)
}

function getHeaders (config) {
  if (!Array.isArray(config.headers)) return []

  return config.headers
    .filter(key => typeof key === 'string')
    .map(key => key.toLowerCase())
}

function getHooks (config) {
  const noop = () => {}
  const request = (config.hooks && config.hooks.request) || noop

  return { request }
}