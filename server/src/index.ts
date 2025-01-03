import { app } from './app'

const port = process.env.PORT ?? 3000
const host = process.env.HOST ?? 'localhost'

process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection %O', reason))

app.listen(port, () => {
  console.info(`Server listening on http://${host}:${port}`)
})
