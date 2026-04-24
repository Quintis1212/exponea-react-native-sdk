export const debugLog = (...args: unknown[]): void => {
  if (__DEV__) console.log(...args);
};

export const debugWarn = (...args: unknown[]): void => {
  if (__DEV__) console.warn(...args);
};

export const debugError = (...args: unknown[]): void => {
  if (__DEV__) console.error(...args);
};
