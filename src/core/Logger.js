export const log = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args); // eslint-disable-line no-console
  }
};
