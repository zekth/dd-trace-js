'use strict'

const { LISTEN_PORT = '8127' } = process.env

const app = require('./packages/dd-trace/src/forwarder/app')

app.listen(LISTEN_PORT)
