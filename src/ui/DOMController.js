const elementCache = new Map();

const getElement = id => {
  if (!elementCache.has(id)) {
    elementCache.set(id, document.getElementById(id));
  }
  return elementCache.get(id);
};

export const initDOM = () => {
  [
    'timer',
    'score',
    'goalPopup',
    'goalText',
    'goalScore',
    'gameTimer',
    'gameScore',
    'matchProgress',
    'bettingStatus',
    'bettingTimer',
    'overlayBettingTimer',
    'overlayTimerValue',
    'overlayStatusIndicator',
    'overlayStatusText',
    'bettingMarkets',
    'bettingTimerContainer',
    'betMessage',
    'betslipContent',
    'emptyBetslip'
  ].forEach(id => getElement(id));
};

const setText = (id, text) => {
  const el = getElement(id);
  if (el) {
    el.textContent = text;
  }
};

const setHTML = (id, html) => {
  const el = getElement(id);
  if (el) {
    el.innerHTML = html;
  }
};

const setDisplay = (id, value) => {
  const el = getElement(id);
  if (el) {
    el.style.display = value;
  }
};

const setClassList = (id, classes) => {
  const el = getElement(id);
  if (el) {
    el.className = classes;
  }
};

const addClass = (id, className) => {
  const el = getElement(id);
  if (el) {
    el.classList.add(className);
  }
};

const removeClass = (id, className) => {
  const el = getElement(id);
  if (el) {
    el.classList.remove(className);
  }
};

export const attachCanvas = canvas => {
  const container = getElement('gameCanvasContainer') || document.body;
  if (canvas && container && !container.contains(canvas)) {
    container.appendChild(canvas);
  }
};

export const updateTimerDisplay = text => {
  setText('timer', text);
  setText('gameTimer', text);
};

export const updateScoreDisplay = score => {
  const html = `<span class="team-red">Red: ${score.red}</span> - <span class="team-blue">Blue: ${score.blue}</span>`;
  setHTML('score', html);
  setHTML('gameScore', html);
};

export const showGoalPopup = ({ team, message, scoreText }) => {
  const popup = getElement('goalPopup');
  if (!popup) return;
  popup.className = `goal-popup show ${team}-goal`;
  setText('goalText', message);
  setText('goalScore', scoreText);
};

export const hideGoalPopup = () => {
  const popup = getElement('goalPopup');
  if (!popup) return;
  removeClass('goalPopup', 'show');
};

export const updateMatchProgress = text => setText('matchProgress', text);

export const setBettingStatus = ({ statusClass, text }) => {
  const container = getElement('bettingStatus');
  if (container) {
    container.className = `betting-status ${statusClass}`;
    const statusText = container.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = text;
    }
    const statusIcon = container.querySelector('.status-icon');
    if (statusIcon) {
      statusIcon.textContent = statusClass.includes('open') ? '🟢' : '🔴';
    }
  }
  setText('overlayStatusText', text);
  const indicator = getElement('overlayStatusIndicator');
  if (indicator) {
    indicator.textContent = statusClass.includes('open') ? '●' : '○';
  }
};

export const setBettingTimer = seconds => {
  const formatted = formatSeconds(seconds);
  setText('bettingTimer', formatted);
  setText('overlayTimerValue', formatted);
};

const formatSeconds = seconds => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const toggleBettingTimerVisibility = visible => {
  setDisplay('overlayBettingTimer', visible ? 'block' : 'none');
  setDisplay('bettingTimerContainer', visible ? 'flex' : 'none');
};

export const toggleBettingMarkets = enabled => {
  const markets = getElement('bettingMarkets');
  if (!markets) return;
  markets.style.opacity = enabled ? '1' : '0.5';
  markets.style.pointerEvents = enabled ? 'auto' : 'none';
};

export const showBetMessage = (message, tone = 'info') => {
  const el = getElement('betMessage');
  if (!el) return;
  el.textContent = message;
  el.className = `bet-message ${tone}`;
  el.style.display = 'block';
};

export const hideBetMessage = () => {
  setDisplay('betMessage', 'none');
};

export const toggleBetSlip = hasSelection => {
  setDisplay('betslipContent', hasSelection ? 'block' : 'none');
  setDisplay('emptyBetslip', hasSelection ? 'none' : 'block');
};

export const updateOddsValue = (selector, value) => {
  const element = typeof selector === 'string' && selector.startsWith('#')
    ? getElement(selector.substring(1))
    : document.querySelector(selector);
  if (element) {
    element.textContent = value.toFixed(2);
  }
};

export const highlightOdds = selector => {
  const buttons = document.querySelectorAll(selector);
  buttons.forEach(button => {
    button.classList.add('highlight');
    setTimeout(() => button.classList.remove('highlight'), 300);
  });
};

export const toggleScoreboardVisibility = visible => {
  setDisplay('timer', visible ? 'block' : 'none');
  setDisplay('score', visible ? 'block' : 'none');
};

export const getInputValue = id => {
  const el = getElement(id);
  return el ? el.value : null;
};

export const setButtonOddsValue = (selector, value) => {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = value.toFixed(2);
  }
};

export const bindClick = (id, handler) => {
  const el = getElement(id);
  if (el) {
    el.addEventListener('click', handler);
  }
};

export const setInputValue = (id, value) => {
  const el = getElement(id);
  if (el) {
    el.value = value;
  }
};

