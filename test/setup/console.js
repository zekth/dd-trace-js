'use strict'

const sinon = require('sinon')

const levels = ['error', 'warn', 'info', 'debug']

levels.forEach(level => {
  if (!console[level]) { // eslint-disable-line no-console
    console[level] = sinon.stub() // eslint-disable-line no-console
  } else if (!console[level].restore) { // eslint-disable-line no-console
    sinon.stub(console, level)
  }
})
