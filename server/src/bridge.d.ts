/// <reference types="node" />

declare module '@capacitor/cli' {
  interface PluginsConfig {
    /**
     * These config values are available:
     */
    CapacitorNodeJS?: {
      /**
       * Relative path of the integrated Node.js project based on the Capacitor webdir.
       *
       * @since 1.0.0
       * @default "nodejs"
       * @example "custom-nodejs"
       */
      nodeDir?: string
      /**
       * Startup mode of the Node.js engine.
       *
       * The following values are accepted:
       * **`auto`**: The Node.js engine starts automatically when the application is launched.
       * **`manual`**: The Node.js engine is started via the `NodeJS.start()` method.
       *
       * @since 1.0.0
       * @default "auto"
       * @example "manual"
       */
      startMode?: 'auto' | 'manual'
    }
  }
}

declare module 'bridge' {
  import { EventEmitter } from 'events'

  class Channel extends EventEmitter {
    private channelName
    constructor(channelName: string)
    /**
     * Sends a message to the Capacitor layer via eventName, along with arguments.
     * Arguments will be serialized with JSON.
     *
     * @param eventName The name of the event being send to.
     * @param args The Array of arguments to send.
     */
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

  /**
   * Provides a few methods to send messages from the Node.js process to the Capacitor layer,
   * and to receive replies from the Capacitor layer.
   */
  const eventChannel: Channel
  /**
   * Emitted when the application gains focus.
   */
  function onResume(listener: () => void): void
  /**
   * Emitted when the application loses focus.
   */
  function onPause(listener: () => void): void
  /**
   * Returns a path for a per-user application data directory on each platform,
   * where data can be read and written.
   */
  function getDataPath(): string

  export { eventChannel as channel, getDataPath, onPause, onResume }
}
