const timeouts = new Set();
const intervals = new Set();

export const scheduleTimeout = (handler, delay, ...args) => {
  const id = setTimeout(() => {
    timeouts.delete(id);
    handler(...args);
  }, delay);
  timeouts.add(id);
  return id;
};

export const scheduleInterval = (handler, delay, ...args) => {
  const id = setInterval(handler, delay, ...args);
  intervals.add(id);
  return id;
};

export const clearScheduledTimeout = id => {
  if (timeouts.has(id)) {
    clearTimeout(id);
    timeouts.delete(id);
  }
};

export const clearScheduledInterval = id => {
  if (intervals.has(id)) {
    clearInterval(id);
    intervals.delete(id);
  }
};

export const clearAllTimers = () => {
  for (const id of timeouts) {
    clearTimeout(id);
  }
  for (const id of intervals) {
    clearInterval(id);
  }
  timeouts.clear();
  intervals.clear();
};

