import path from 'path'
import { getDataPath } from './bridge'
import { dir, exists, copy } from 'fs-jetpack'

export const initNodeFs = () => {
  // node install path
  const runningPath = __dirname
  const installPath = path.resolve(runningPath, '..')
  const installPublicPath = path.resolve(installPath, process.env.PUBLIC ?? 'server_public')
  const installFavIconPath = path.resolve(installPublicPath, 'favicon.png')

  // data storage path
  const dataPath = getDataPath()

  // public folder in data storage path
  const dataPublicPath = path.resolve(dataPath, 'server_public')
  const dataPublicFavIconPath = path.resolve(dataPublicPath, 'favicon.png')

  // make sure data public folder exists outside install path
  dir(dataPublicPath)
  if (!exists(dataPublicFavIconPath)) {
    copy(installFavIconPath, dataPublicFavIconPath)
  }

  return {
    runningPath,
    installPath,
    installPublicPath,
    installFavIconPath,
    dataPath,
    dataPublicPath
  }
}
