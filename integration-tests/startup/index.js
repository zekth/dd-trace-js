'use strict'

const options = {}

if (process.env.AGENT_PORT) {
  options.port = process.env.AGENT_PORT
}

if (process.env.AGENT_URL) {
  options.url = process.env.AGENT_URL
}

require('dd-trace').init(options)

const http = require('http')
const winston = require('winston')

const logger = winston.createLogger({
  level: 'info',
  transports: [new winston.transports.Console()]
})

const server = http.createServer((req, res) => {
  logger.info(`${req.method} ${req.url}`)
  res.end('hello, world\n')
}).listen(0, () => {
  const port = server.address().port
  process.send({ port })
})
