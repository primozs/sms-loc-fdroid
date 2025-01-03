import path from 'path'

// production
export { channel, getDataPath } from 'bridge'

// dev
// let channel: Channel | undefined

// function getDataPath() {
//   return path.resolve(__dirname, '..', 'data')
// }

// export { channel, getDataPath }

// for development outside android
interface Channel {
  send(eventName: string, ...args: any[]): void
  emitWrapper(eventName: string, ...args: any[]): void
  /**
   * Listens to `eventName` and calls `listener(args...)` when a new message arrives from the Capacitor layer.
   */
  on(eventName: string, listener: (...args: any[]) => void): this
  /**
   * Listens one time to `eventName` and calls `listener(args...)` when a new message
   * arrives from the Capacitor layer, after which it is removed.
   */
  once(eventName: string, listener: (...args: any[]) => void): this
  /**
   * Alias for `channel.on(eventName, listener)`.
   */
  addListener(eventName: string, listener: (...args: any[]) => void): this
  /**
   * Removes the specified `listener` from the listener array for the specified `eventName`.
   */
  removeListener(eventName: string, listener: (...args: any[]) => void): this
  /**
   * Removes all listeners, or those of the specified `eventName`.
   *
   * @param eventName The name of the event all listeners will be removed from.
   */
  removeAllListeners(eventName?: string): this
}
