import express from 'express'
import cors from 'cors'
import { initNodeFs } from './initNodeFs'
import { offlineMapsChannel } from './downloadOfflineMap'

const app = express()
require('express-async-errors')

app.use(cors())

const processPaths = initNodeFs()

app.use(express.static(processPaths.dataPublicPath))

app.get('/', (req, res) => {
  res.json(process.versions)
})

app.get('/healthy', (req, res) => {
  const ts = new Date().getTime()
  res.json({ now: new Date(ts).toISOString(), ts })
})

function logErrors(err: any, req: any, res: any, next: any) {
  console.error(err.stack)
  next(err)
}

function errorHandler(err: any, req: any, res: any, next: any) {
  res.status(500)
  res.json({ error: err })
}

app.use(logErrors)
app.use(errorHandler)

offlineMapsChannel()

export { app }
