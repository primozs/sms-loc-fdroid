import { Device } from '@capacitor/device';
import { config } from '@/config';
import { Logger } from './logger';
import { App } from '@capacitor/app';

export const logError = async (error?: any) => {
  const device = await Device.getInfo();
  const logger = Logger.getInstance();

  const payload = {
    version: config.APPLICATION_VERSION,
    device,
    error: JSON.stringify(error, replaceErrors),
    url: window.location.href || '',
  };

  console.error('logError', { error });
  logger.error(error?.message ?? 'Error:', payload);
};

export const logDebug = async (message: string, data: any) => {
  if (config.DEV) {
    const logger = Logger.getInstance();
    let dataStr = '';
    try {
      dataStr = JSON.stringify(data, null, 2);
    } catch {}

    const payload = {
      version: config.APPLICATION_VERSION,
      data: dataStr,
      url: window.location.href || '',
    };

    console.log('message', message, { data });
    logger.debug(message, payload);
  }
};

export const initErrorLogging = async () => {
  const logger = Logger.getInstance();
  const device = await Device.getInfo();

  window.onerror = function (msg, url, lineNo, columnNo, error) {
    try {
      const payload = {
        version: config.APPLICATION_VERSION,
        device,
        url: window.location.href || '',
        messageOrEvent: msg || '',
        source: url || '',
        lineno: lineNo || '',
        colno: columnNo || '',
        error: JSON.stringify(error, replaceErrors),
      };

      logger.error('client onerror', payload);
    } catch {
      // squelch, because we don’t want to prevent method from returning true
    }

    // When the function returns true, this prevents the firing of the default event handler.
    return true;
  };

  App.addListener('pause', async () => {
    await logger.flush();
  });
};

function replaceErrors(key: any, value: any) {
  if (value instanceof Error) {
    const error = {};

    Object.getOwnPropertyNames(value).forEach(function (propName) {
      // @ts-expect-error types
      error[propName] = value[propName];
    });

    return error;
  }

  return value;
}
