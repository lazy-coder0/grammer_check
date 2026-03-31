// STATE
let currentMode = 'grammar';
let currentUser = null;

const DEFAULT_MODELS = (window.WR_CONFIG && window.WR_CONFIG.models) || {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o-mini',
  google: 'gemini-1.5-flash'
};

// Load session
window.onload = () => {
  const saved = localStorage.getItem('wr_session');
  if (saved) {
    currentUser = normalizeUser(JSON.parse(saved));
    setLoggedIn();
    showPage('profile');
  }
};

// PAGES
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (id === 'profile') refreshProfile();
  if (id === 'checker') refreshHistory();
}

// AUTH
function register() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const provider = document.getElementById('reg-provider').value;
  const model = document.getElementById('reg-model').value.trim() || DEFAULT_MODELS[provider];
  const apiInput = document.getElementById('reg-api').value.trim();
  const api = resolveProviderApiKey(provider, apiInput);
  const err = document.getElementById('reg-error');

  if (!name || !email || !pass) { showErr(err, 'Please fill all fields.'); return; }
  if (!api) { showErr(err, 'Please add a valid API key for the selected provider.'); return; }
  if (pass.length < 6) { showErr(err, 'Password must be at least 6 characters.'); return; }
  if (!validateApiKey(provider, api)) { showErr(err, 'Invalid API key format for selected provider.'); return; }

  const users = JSON.parse(localStorage.getItem('wr_users') || '{}');
  if (users[email]) { showErr(err, 'Email already registered. Please log in.'); return; }

  users[email] = { name, email, pass, api, provider, model, joined: Date.now(), checks: 0, words: 0 };
  localStorage.setItem('wr_users', JSON.stringify(users));

  currentUser = normalizeUser(users[email]);
  localStorage.setItem('wr_session', JSON.stringify(currentUser));
  setLoggedIn();
  showPage('profile');
  showToast('Welcome to WriteRight, ' + name + '!');
}

function login() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');

  const users = JSON.parse(localStorage.getItem('wr_users') || '{}');
  if (!users[email] || users[email].pass !== pass) {
    showErr(err, 'Invalid email or password.'); return;
  }
  currentUser = normalizeUser(users[email]);
  localStorage.setItem('wr_session', JSON.stringify(currentUser));
  setLoggedIn();
  showPage('profile');
  showToast('Welcome back, ' + currentUser.name + '!');
}

function logout() {
  currentUser = null;
  localStorage.removeItem('wr_session');
  document.getElementById('nav-btns').style.display = 'flex';
  document.getElementById('nav-user').style.display = 'none';
  showPage('home');
  showToast('Logged out successfully.');
}

function setLoggedIn() {
  document.getElementById('nav-btns').style.display = 'none';
  document.getElementById('nav-user').style.display = 'flex';
}

// PROFILE
function refreshProfile() {
  if (!currentUser) return;
  document.getElementById('profile-name').textContent = currentUser.name;
  document.getElementById('profile-email').textContent = currentUser.email;
  document.getElementById('profile-avatar').textContent = currentUser.name[0].toUpperCase();
  document.getElementById('profile-api-status').textContent = 'Connected: ' + capitalize(currentUser.provider) + ' • ' + currentUser.model;
  document.getElementById('stat-checks').textContent = currentUser.checks || 0;
  document.getElementById('stat-words').textContent = currentUser.words || 0;
  const days = Math.max(1, Math.floor((Date.now() - currentUser.joined) / 86400000));
  document.getElementById('stat-days').textContent = days;
}

// API MODAL
function openApiModal() {
  document.getElementById('modal-provider').value = currentUser.provider || 'anthropic';
  document.getElementById('modal-model').value = currentUser.model || DEFAULT_MODELS[currentUser.provider || 'anthropic'];
  document.getElementById('modal-api').value = currentUser.api || '';
  document.getElementById('api-modal').classList.add('open');
}

function closeApiModal() {
  document.getElementById('api-modal').classList.remove('open');
}

function saveApiKey() {
  const provider = document.getElementById('modal-provider').value;
  const model = document.getElementById('modal-model').value.trim() || DEFAULT_MODELS[provider];
  const key = resolveProviderApiKey(provider, document.getElementById('modal-api').value.trim());
  if (!validateApiKey(provider, key)) { showToast('Invalid API key format for selected provider.'); return; }

  currentUser.provider = provider;
  currentUser.model = model;
  currentUser.api = key;
  saveUser();
  closeApiModal();
  refreshProfile();
  showToast('AI settings updated.');
}

// CHECKER
function selectMode(el) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentMode = el.dataset.mode;
}

function updateCount() {
  const val = document.getElementById('input-text').value;
  document.getElementById('char-count').textContent = val.length + ' chars';
}

const PROMPTS = {
  grammar: 'You are an expert English grammar editor. Fix all grammar, punctuation, spelling, and sentence-structure errors. Output format: 1) Corrected Paragraph, 2) Key Word/Line Fixes (bullet list with original -> improved), 3) Why These Fixes Help (short bullets).',
  style: 'You are a writing coach. Improve clarity, rhythm, and readability while preserving meaning. Output format: 1) Improved Paragraph, 2) Better Word Choices (original -> improved), 3) Style Notes.',
  rephrase: 'Rephrase the text for clarity and stronger wording without changing meaning. Output format: 1) Rephrased Paragraph, 2) Line-by-Line Improvements, 3) Quick Notes.',
  formal: 'Rewrite the text in a professional formal tone. Output format: 1) Formal Version, 2) Key Professional Phrasing Changes, 3) Notes.',
  simple: 'Simplify the text using plain language and shorter sentences. Output format: 1) Simplified Version, 2) Hard Words Replaced, 3) Why It Is Easier Now.'
};

async function checkText() {
  if (!currentUser) { showToast('Please log in first.'); showPage('login'); return; }

  const text = document.getElementById('input-text').value.trim();
  if (!text) { showToast('Please enter some text first.'); return; }

  const btn = document.getElementById('check-btn');
  const spin = document.getElementById('spinner');
  const lbl = document.getElementById('btn-label');
  const output = document.getElementById('output-area');

  btn.disabled = true;
  spin.style.display = 'block';
  lbl.textContent = 'Analysing...';
  output.innerHTML = '<span class="output-placeholder">AI is reading your text...</span>';

  try {
    const result = await requestAiSuggestion(text);
    output.textContent = result;

    currentUser.checks = (currentUser.checks || 0) + 1;
    currentUser.words = (currentUser.words || 0) + text.split(/\s+/).length;
    saveUser();

    const hist = JSON.parse(localStorage.getItem('wr_hist_' + currentUser.email) || '[]');
    hist.unshift({
      time: Date.now(),
      inputPreview: text.slice(0, 80),
      fullInput: text,
      output: result,
      mode: currentMode
    });
    if (hist.length > 20) hist.pop();
    localStorage.setItem('wr_hist_' + currentUser.email, JSON.stringify(hist));
    refreshHistory();

    showToast('Done.');
  } catch (e) {
    output.innerHTML = '<span style="color:var(--rust)">Error: ' + e.message + '</span>';
    showToast('Something went wrong. Check your API key.');
  } finally {
    btn.disabled = false;
    spin.style.display = 'none';
    lbl.textContent = 'Analyse Text';
  }
}

function copyOutput() {
  const txt = document.getElementById('output-area').textContent;
  if (!txt || txt === 'Your improved text will appear here...') { showToast('Nothing to copy yet.'); return; }
  navigator.clipboard.writeText(txt).then(() => showToast('Copied.'));
}

function refreshHistory() {
  if (!currentUser) return;
  const list = document.getElementById('history-list');
  const hist = JSON.parse(localStorage.getItem('wr_hist_' + currentUser.email) || '[]');
  if (!hist.length) {
    list.innerHTML = '<div class="no-history">No checks yet. Paste some text to get started!</div>';
    return;
  }
  list.innerHTML = hist.map(h =>
    '<div class="history-item" onclick="loadHistory(' + h.time + ')">' +
      '<span>' + (h.inputPreview || (h.input ? h.input.slice(0, 80) : '')) + '...</span>' +
      '<span class="time">' + timeAgo(h.time) + '</span>' +
    '</div>'
  ).join('');
}

function loadHistory(time) {
  const hist = JSON.parse(localStorage.getItem('wr_hist_' + currentUser.email) || '[]');
  const item = hist.find(h => h.time === time);
  if (!item) return;
  document.getElementById('input-text').value = item.fullInput || item.input || '';
  document.getElementById('output-area').textContent = item.output;
  updateCount();
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', c.dataset.mode === item.mode);
  });
}

async function requestAiSuggestion(text) {
  const provider = currentUser.provider || 'anthropic';
  const model = currentUser.model || DEFAULT_MODELS[provider];
  const prompt = PROMPTS[currentMode] + '\n\nOriginal Text:\n' + text;

  if (provider === 'google') {
    return callGoogle(prompt, model);
  }
  if (provider === 'openai') {
    return callOpenAI(prompt, model);
  }
  return callAnthropic(prompt, model);
}

async function callGoogle(prompt, model) {
  const timeoutMs = (window.WR_CONFIG && window.WR_CONFIG.api && window.WR_CONFIG.api.timeoutMs) || 30000;
  const key = resolveProviderApiKey('google', currentUser.api || '');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error && errData.error.message ? errData.error.message : 'Google API error ' + res.status);
    }

    const data = await res.json();
    return data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]
      ? data.candidates[0].content.parts[0].text
      : 'No response.';
  } finally {
    clearTimeout(timeout);
  }
}

async function callAnthropic(prompt, model) {
  const timeoutMs = (window.WR_CONFIG && window.WR_CONFIG.api && window.WR_CONFIG.api.timeoutMs) || 30000;
  const maxTokens = (window.WR_CONFIG && window.WR_CONFIG.api && window.WR_CONFIG.api.maxTokens) || 1500;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': currentUser.api,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error && errData.error.message ? errData.error.message : 'Anthropic API error ' + res.status);
    }

    const data = await res.json();
    return data.content && data.content[0] && data.content[0].text ? data.content[0].text : 'No response.';
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAI(prompt, model) {
  const timeoutMs = (window.WR_CONFIG && window.WR_CONFIG.api && window.WR_CONFIG.api.timeoutMs) || 30000;
  const temperature = (window.WR_CONFIG && window.WR_CONFIG.api && window.WR_CONFIG.api.temperature) || 0.3;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUser.api
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: 'system', content: 'You are a precise writing correction assistant.' },
          { role: 'user', content: prompt }
        ]
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error && errData.error.message ? errData.error.message : 'OpenAI API error ' + res.status);
    }

    const data = await res.json();
    return data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : 'No response.';
  } finally {
    clearTimeout(timeout);
  }
}

// UTILS
function normalizeUser(user) {
  const provider = user.provider || 'anthropic';
  return {
    ...user,
    provider,
    model: user.model || DEFAULT_MODELS[provider]
  };
}

function validateApiKey(provider, key) {
  if (!key) return false;
  if (provider === 'anthropic') return key.startsWith('sk-ant-');
  if (provider === 'openai') return key.startsWith('sk-');
  if (provider === 'google') return key.startsWith('AIza');
  return false;
}

function resolveProviderApiKey(provider, userInputKey) {
  if (userInputKey) return userInputKey;
  if (provider === 'google' && window.WR_CONFIG && window.WR_CONFIG.googleApiKey) {
    return window.WR_CONFIG.googleApiKey;
  }
  return '';
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function saveUser() {
  localStorage.setItem('wr_session', JSON.stringify(currentUser));
  const users = JSON.parse(localStorage.getItem('wr_users') || '{}');
  users[currentUser.email] = currentUser;
  localStorage.setItem('wr_users', JSON.stringify(users));
}

function showErr(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'just now';
  if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
  return Math.floor(d / 86400000) + 'd ago';
}
