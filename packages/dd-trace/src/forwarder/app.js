'use strict'

const express = require('express')
const { msgpack } = require('./middleware')
const { AgentExporter } = require('../profiling/exporters/agent')

const { FORWARD_URL = 'http://localhost:8126' } = process.env

const profileExporter = new AgentExporter({ url: FORWARD_URL })
const app = express()

app.post('/profile', msgpack(), async (req, res) => {
  res.status(200).send()

  try {
    await profileExporter.export(req.body)
  } catch (e) {
    console.error(e) // eslint-disable-line no-console
  }
})

module.exports = app
