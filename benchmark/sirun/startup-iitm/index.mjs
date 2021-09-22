import express from 'express'
import mainroute from './mainroute.mjs?c=1'

const app = express()

app.get(mainroute)

const server = app.listen(0, () => {
  server.close()
})
