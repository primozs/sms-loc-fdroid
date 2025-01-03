import { WebPlugin } from '@capacitor/core';

import type {
  CallbackID,
  ClearWatchOptions,
  GeolocationPlugin,
  PermissionStatus,
  Position,
  PositionOptions,
  WatchPositionCallback,
} from './definitions';

export class GeolocationWeb extends WebPlugin implements GeolocationPlugin {
  async getCurrentPosition(options?: PositionOptions): Promise<Position> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve(pos);
        },
        (err) => {
          reject(err);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0,
          ...options,
        },
      );
    });
  }

  async watchPosition(
    options: PositionOptions,
    callback: WatchPositionCallback,
  ): Promise<CallbackID> {
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        callback(pos);
      },
      (err) => {
        callback(null, err);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0,
        ...options,
      },
    );

    return `${id}`;
  }

  async clearWatch(options: { id: string }): Promise<void> {
    window.navigator.geolocation.clearWatch(parseInt(options.id, 10));
  }

  async checkPermissions(): Promise<PermissionStatus> {
    if (typeof navigator === 'undefined' || !navigator.permissions) {
      throw this.unavailable('Permissions API not available in this browser');
    }

    const permission = await window.navigator.permissions.query({
      name: 'geolocation',
    });
    return { location: permission.state, coarseLocation: permission.state };
  }

  async requestPermissions(): Promise<PermissionStatus> {
    throw this.unimplemented('Not implemented on web.');
  }

  openLocationSettings(
    // eslint-disable-next-line
    options?: { message?: string | undefined } | undefined,
  ): Promise<void> {
    console.log('not implemented');
    // @ts-ignore
    return;
  }

  openSettings(): Promise<void> {
    console.log('not implemented');
    // @ts-ignore
    return;
  }

  addBackgroundWatcher(
    // eslint-disable-next-line
    options: {
      backgroundTitle?: string | undefined;
      backgroundMessage?: string | undefined;
      enableHighAccuracy?: boolean | undefined;
    },
    // eslint-disable-next-line
    callback: WatchPositionCallback,
  ): Promise<string> {
    console.log('not implemented');
    // @ts-ignore
    return;
  }

  // eslint-disable-next-line
  removeBackgroundWatcher(options: ClearWatchOptions): Promise<void> {
    console.log('not implemented');
    // @ts-ignore
    return;
  }
}

const Geolocation = new GeolocationWeb();

export { Geolocation };
