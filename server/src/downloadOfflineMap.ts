import { pipeline as streamPipeline } from 'node:stream/promises'
import fs from 'fs-jetpack'
import path from 'path'
import compressing from 'compressing'
import { initNodeFs } from './initNodeFs'
import { channel } from './bridge'

type OfflineChannelAction = 'install' | 'status' | 'remove' | 'installCancel'
const ResponseAction = {
  progress: 'progress',
  installed: 'installed',
  status: 'status',
  installCancel: 'installCancel',
  removed: 'removed',
  install_error: 'install_error',
  status_error: 'status_error',
  remove_error: 'remove_error',
  message: 'message'
} as const

export const offlineMapsChannel = () => {
  if (!channel) return

  let cancelDownload: (() => void) | undefined = undefined

  channel.addListener('offline-maps-channel-node', async (action: OfflineChannelAction) => {
    if (action === 'install') {
      try {
        await offlineMap(
          (progress) => {
            channel?.send('offline-maps-channel-progress', ResponseAction.progress, progress)
          },
          (destroyFn) => {
            cancelDownload = destroyFn
          }
        )

        const info = checkMapFiles()

        if (!info.installed) {
          channel?.send('offline-maps-channel', ResponseAction.message, info)
          throw new Error('MAP_INSTALL_UNSUCCESSFULL')
        }

        channel?.send('offline-maps-channel', ResponseAction.installed, info.installed)
      } catch (error) {
        channel?.send('offline-maps-channel', ResponseAction.install_error, error)
      }
    }

    if (action === 'installCancel') {
      try {
        cancelDownload && cancelDownload()
      } catch (error) {
        channel?.send('offline-maps-channel', ResponseAction.install_error, error)
      }
    }

    if (action === 'status') {
      try {
        const info = checkMapFiles()
        channel?.send('offline-maps-channel', ResponseAction.status, info.installed, info)
      } catch (error) {
        channel?.send('offline-maps-channel', ResponseAction.status_error, error)
      }
    }
    if (action === 'remove') {
      try {
        const { dataPublicPath } = initNodeFs()
        const dataPublicMapPath = path.resolve(dataPublicPath, 'map')
        await fs.removeAsync(dataPublicMapPath)
        channel?.send('offline-maps-channel', ResponseAction.removed, true)
      } catch (error) {
        channel?.send('offline-maps-channel', ResponseAction.remove_error, error)
      }
    }
  })
}

const FILENAME = 'map.tar.gz'
const FILE_URL =
  process.env.OFFLINE_MAP_DOWNLOAD_URL ??
  'https://github.com/primozs/small-planet/raw/master/public/map.tar.gz'

const offlineMap = async (progressCb: (e: ProgressEv) => void, destroyCb: (destroy: () => void) => void) => {
  const { dataPublicPath } = initNodeFs()
  const dataPublicMapZipPath = path.resolve(dataPublicPath, FILENAME)
  const dataPublicMapPath = path.resolve(dataPublicPath, 'map')

  if (fs.exists(dataPublicMapPath) === 'dir') {
    await fs.removeAsync(dataPublicMapPath)
  }
  if (fs.exists(dataPublicMapZipPath) === 'file') {
    await fs.removeAsync(dataPublicMapZipPath)
  }

  await downloadOfflineMap(FILE_URL, dataPublicMapZipPath, progressCb, destroyCb)
  await compressing.tgz.uncompress(dataPublicMapZipPath, dataPublicPath)
  await fs.removeAsync(dataPublicMapZipPath)
}

type ProgressEv = {
  percent: number
  transferred: number
  total: number
}

const downloadOfflineMap = async (
  url: string,
  toPath: string,
  progressCb: (e: ProgressEv) => void,
  destroyCb: (destroy: () => void) => void
) => {
  const got = (await import('got')).default

  const stream = got.stream(url)

  let call = 0
  stream.on('downloadProgress', (progress: ProgressEv) => {
    // otherwise progress looks like nothing is happening
    if (progress.total === 0) {
      progressCb(progress)
    } else if (call % 20 === 0) {
      progressCb(progress)
    }
    call += 1
  })

  destroyCb(() => {
    stream.destroy()
  })

  const wStream = fs.createWriteStream(toPath)
  await streamPipeline(stream, wStream)
}

const checkMapFiles = () => {
  const { dataPublicPath } = initNodeFs()
  const dataPublicMapPath = path.resolve(dataPublicPath, 'map')
  // folder exists
  const folderExists = fs.exists(dataPublicMapPath) === 'dir'

  const fontsExists = fs.exists(path.resolve(dataPublicMapPath, 'fonts')) === 'dir'
  const stylesExists = fs.exists(path.resolve(dataPublicMapPath, 'styles')) === 'dir'
  const tilesExists = fs.exists(path.resolve(dataPublicMapPath, 'tiles')) === 'dir'

  const subfoldersExist = fontsExists && stylesExists && tilesExists

  const styleJsonExists =
    fs.exists(path.resolve(dataPublicMapPath, 'styles', 'planet-small', 'style.json')) === 'file'

  return {
    folderExists,
    fontsExists,
    stylesExists,
    tilesExists,
    styleJsonExists,
    installed: folderExists && subfoldersExist && styleJsonExists
  }
}
