/* ===================================================================
   NOVA — Next-Generation Calculator
   =================================================================== */

// ─── THEME ENGINE ──────────────────────────────────────────────────

const Theme = {
  _current: 'auto',
  _timeCheckInterval: null,

  init() {
    const saved = localStorage.getItem('nova-theme');
    this._current = saved || 'auto';
    this.apply(this._current);
    this._highlightBtn(this._current);

    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        this.apply(theme);
        this._highlightBtn(theme);
        localStorage.setItem('nova-theme', theme);
      });
    });

    if (this._current === 'auto') {
      this._startAutoSwitch();
    }
  },

  apply(theme) {
    if (theme === 'auto') {
      this._current = 'auto';
      document.documentElement.setAttribute('data-theme', this._computeAutoTheme());
      this._startAutoSwitch();
    } else {
      this._current = theme;
      document.documentElement.setAttribute('data-theme', theme);
      this._stopAutoSwitch();
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      meta.setAttribute('content', isDark ? '#0a0a0f' : '#e8ecf1');
    }
  },

  _computeAutoTheme() {
    const h = new Date().getHours();
    if (h >= 6 && h < 8) return 'light';
    if (h >= 8 && h < 18) return 'light';
    if (h >= 18 && h < 20) return 'dark';
    return 'dark';
  },

  _startAutoSwitch() {
    this._stopAutoSwitch();
    this._timeCheckInterval = setInterval(() => {
      if (this._current === 'auto') {
        document.documentElement.setAttribute('data-theme', this._computeAutoTheme());
      }
    }, 60000);
  },

  _stopAutoSwitch() {
    if (this._timeCheckInterval) {
      clearInterval(this._timeCheckInterval);
      this._timeCheckInterval = null;
    }
  },

  _highlightBtn(theme) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }
};


// ─── CALCULATOR ENGINE ────────────────────────────────────────────

const CalcEngine = {
  _precedence: { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 },
  _rightAssoc: { '^': true },

  _isDigit(c) { return c >= '0' && c <= '9'; },
  _isAlpha(c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); },
  _isOp(c) { return '+-*/%^'.includes(c); },

  _tokenize(expr) {
    const tokens = [];
    let i = 0;
    const len = expr.length;

    while (i < len) {
      const ch = expr[i];

      if (ch === ' ') { i++; continue; }

      if (this._isDigit(ch) || ch === '.') {
        let num = '';
        let dotSeen = false;
        while (i < len && (this._isDigit(expr[i]) || expr[i] === '.')) {
          if (expr[i] === '.') {
            if (dotSeen) break;
            dotSeen = true;
          }
          num += expr[i];
          i++;
        }
        tokens.push({ type: 'num', value: num });
        continue;
      }

      if (this._isAlpha(ch)) {
        let name = '';
        while (i < len && this._isAlpha(expr[i])) {
          name += expr[i];
          i++;
        }
        const lower = name.toLowerCase();
        if (lower === 'pi') {
          tokens.push({ type: 'num', value: Math.PI.toString() });
        } else if (lower === 'e') {
          tokens.push({ type: 'num', value: Math.E.toString() });
        } else {
          tokens.push({ type: 'func', value: lower });
        }
        continue;
      }

      if (ch === '(') {
        tokens.push({ type: 'lparen' });
        i++;
        continue;
      }

      if (ch === ')') {
        tokens.push({ type: 'rparen' });
        i++;
        continue;
      }

      if (this._isOp(ch)) {
        if (ch === '-' && (tokens.length === 0 ||
            tokens[tokens.length - 1].type === 'lparen' ||
            tokens[tokens.length - 1].type === 'op')) {
          tokens.push({ type: 'num', value: '-1' });
          tokens.push({ type: 'op', value: '*' });
        } else if (ch === '+' && (tokens.length === 0 ||
            tokens[tokens.length - 1].type === 'lparen' ||
            tokens[tokens.length - 1].type === 'op')) {
          i++;
          continue;
        } else {
          tokens.push({ type: 'op', value: ch });
        }
        i++;
        continue;
      }

      i++;
    }

    return tokens;
  },

  _shuntingYard(tokens) {
    const output = [];
    const stack = [];

    for (const token of tokens) {
      switch (token.type) {
        case 'num':
          output.push(token);
          break;

        case 'func':
          stack.push(token);
          break;

        case 'lparen':
          stack.push(token);
          break;

        case 'rparen':
          while (stack.length && stack[stack.length - 1].type !== 'lparen') {
            output.push(stack.pop());
          }
          stack.pop();
          if (stack.length && stack[stack.length - 1].type === 'func') {
            output.push(stack.pop());
          }
          break;

        case 'op':
          while (stack.length &&
                 stack[stack.length - 1].type === 'op' &&
                 (this._precedence[stack[stack.length - 1].value] > this._precedence[token.value] ||
                  (this._precedence[stack[stack.length - 1].value] === this._precedence[token.value] &&
                   !this._rightAssoc[token.value]))) {
            output.push(stack.pop());
          }
          stack.push(token);
          break;
      }
    }

    while (stack.length) {
      output.push(stack.pop());
    }

    return output;
  },

  evaluate(expr) {
    if (!expr || expr.trim() === '') return null;

    try {
      const tokens = this._tokenize(expr);
      if (tokens.length === 0) return null;

      const rpn = this._shuntingYard(tokens);
      const evalStack = [];

      for (const token of rpn) {
        switch (token.type) {
          case 'num': {
            const val = parseFloat(token.value);
            if (!isFinite(val)) return { error: 'Overflow' };
            evalStack.push(val);
            break;
          }

          case 'op': {
            const b = evalStack.pop();
            const a = evalStack.pop();
            if (a === undefined || b === undefined) return { error: 'Syntax error' };

            let result;
            switch (token.value) {
              case '+': result = a + b; break;
              case '-': result = a - b; break;
              case '*': result = a * b; break;
              case '/':
                if (b === 0) return { error: 'Cannot divide by zero' };
                result = a / b;
                break;
              case '%': result = a % b; break;
              case '^': result = Math.pow(a, b); break;
              default: return { error: 'Unknown operator' };
            }
            if (!isFinite(result)) return { error: 'Overflow' };
            evalStack.push(result);
            break;
          }

          case 'func': {
            const a = evalStack.pop();
            if (a === undefined) return { error: 'Syntax error' };

            let result;
            switch (token.value) {
              case 'sin': result = CalcEngine._sin(a); break;
              case 'cos': result = CalcEngine._cos(a); break;
              case 'tan': result = CalcEngine._tan(a); break;
              case 'log': result = a <= 0 ? NaN : Math.log10(a); break;
              case 'ln': result = a <= 0 ? NaN : Math.log(a); break;
              case 'sqrt':
                if (a < 0) return { error: 'Invalid input for √' };
                result = Math.sqrt(a);
                break;
              case 'abs': result = Math.abs(a); break;
              case 'floor': result = Math.floor(a); break;
              case 'ceil': result = Math.ceil(a); break;
              case 'round': result = Math.round(a); break;
              default: return { error: 'Unknown function' };
            }
            if (isNaN(result)) return { error: 'Math error' };
            if (!isFinite(result)) return { error: 'Overflow' };
            evalStack.push(result);
            break;
          }
        }
      }

      if (evalStack.length !== 1) return { error: 'Syntax error' };

      const result = evalStack[0];
      if (!isFinite(result)) return { error: 'Overflow' };
      return { value: result };
    } catch (e) {
      return { error: 'Syntax error' };
    }
  },

  _toRadians(deg) { return deg * (Math.PI / 180); },
  _sin(a) { return CalcEngine._angleMode === 'DEG' ? Math.sin(CalcEngine._toRadians(a)) : Math.sin(a); },
  _cos(a) { return CalcEngine._angleMode === 'DEG' ? Math.cos(CalcEngine._toRadians(a)) : Math.cos(a); },
  _tan(a) {
    if (CalcEngine._angleMode === 'DEG') {
      if (Math.abs(a % 180) === 90) return { error: 'Undefined' };
      return Math.tan(CalcEngine._toRadians(a));
    }
    return Math.tan(a);
  },

  _angleMode: 'DEG',

  getAngleMode() { return CalcEngine._angleMode; },
  toggleAngleMode() {
    CalcEngine._angleMode = CalcEngine._angleMode === 'DEG' ? 'RAD' : 'DEG';
    return CalcEngine._angleMode;
  },

  formatNumber(num) {
    if (num === null || num === undefined) return '0';
    if (typeof num === 'object' && num.error) return num.error;

    const n = typeof num === 'object' ? num.value : num;
    if (!isFinite(n)) return 'Error';

    const abs = Math.abs(n);

    if (abs >= 1e15 || (abs < 1e-10 && abs !== 0)) {
      return n.toExponential(6);
    }

    const parts = n.toFixed(10).replace(/\.?0+$/, '').split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return parts.join('.');
  },

  formatExpression(expr) {
    if (!expr) return '';
    return expr
      .replace(/\*/g, '×')
      .replace(/\//g, '÷')
      .replace(/pi/g, 'π')
      .replace(/e(?![a-z])/g, 'e')
      .replace(/sqrt/g, '√')
      .replace(/abs/g, '|x|');
  }
};


// ─── STATE ────────────────────────────────────────────────────────

const State = {
  expression: '',
  currentInput: '',
  lastResult: null,
  hasResult: false,
  error: null,
  memory: null,
  history: [],
  angleMode: 'DEG',
  waitingForOperand: false,

  init() {
    this.history = this._loadHistory();
    const savedMemory = localStorage.getItem('nova-memory');
    if (savedMemory) this.memory = parseFloat(savedMemory);
  },

  reset() {
    this.expression = '';
    this.currentInput = '';
    this.lastResult = null;
    this.hasResult = false;
    this.error = null;
    this.waitingForOperand = false;
  },

  _loadHistory() {
    try {
      const data = localStorage.getItem('nova-history');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  _saveHistory() {
    try {
      localStorage.setItem('nova-history', JSON.stringify(this.history));
    } catch {}
  },

  addHistory(expr, result) {
    this.history.unshift({
      expr,
      result: typeof result === 'object' && result.error ? result.error : result,
      time: Date.now()
    });
    if (this.history.length > 100) this.history.pop();
    this._saveHistory();
  },

  clearHistory() {
    this.history = [];
    this._saveHistory();
  }
};


// ─── DISPLAY MANAGER ──────────────────────────────────────────────

const Display = {
  expressionEl: null,
  resultEl: null,
  memoryBadge: null,

  init() {
    this.expressionEl = document.getElementById('expression');
    this.resultEl = document.getElementById('result');
    this.memoryBadge = document.getElementById('memory-badge');
  },

  update() {
    const expr = State.error ? '' : CalcEngine.formatExpression(State.expression);
    this.expressionEl.textContent = expr;

    if (State.error) {
      this.resultEl.textContent = State.error;
      this.resultEl.className = 'result';
      return;
    }

    if (State.hasResult && State.lastResult !== null) {
      const displayVal = typeof State.lastResult === 'object' && State.lastResult.error
        ? State.lastResult.error
        : CalcEngine.formatNumber(State.lastResult);
      this.resultEl.textContent = displayVal;
      this._adjustSize(displayVal);
    } else if (State.currentInput) {
      this.resultEl.textContent = CalcEngine.formatNumber(parseFloat(State.currentInput) || 0);
      this._adjustSize(State.currentInput);
    } else if (State.expression) {
      const result = CalcEngine.evaluate(State.expression);
      if (result && !result.error) {
        this.resultEl.textContent = CalcEngine.formatNumber(result.value);
        this._adjustSize(CalcEngine.formatNumber(result.value));
      } else {
        this.resultEl.textContent = '0';
        this.resultEl.className = 'result';
      }
    } else {
      this.resultEl.textContent = '0';
      this.resultEl.className = 'result';
    }

    this.memoryBadge.classList.toggle('visible', State.memory !== null);
  },

  _adjustSize(text) {
    const len = text.length;
    if (len > 18) {
      this.resultEl.className = 'result xsmall';
    } else if (len > 12) {
      this.resultEl.className = 'result small';
    } else {
      this.resultEl.className = 'result';
    }
  },

  animateResultChange() {
    const el = this.resultEl;
    el.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(4px) scale(0.98)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0) scale(1)';
      });
    });
  }
};


// ─── HISTORY MANAGER ──────────────────────────────────────────────

const HistoryUI = {
  overlay: null,
  list: null,
  _open: false,

  init() {
    this.overlay = document.getElementById('history-overlay');
    this.list = document.getElementById('history-list');

    document.getElementById('history-btn').addEventListener('click', () => this.open());
    document.getElementById('history-close').addEventListener('click', () => this.close());
    document.getElementById('history-clear').addEventListener('click', () => {
      State.clearHistory();
      this.render();
      Toast.show('History cleared');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._open) this.close();
    });
  },

  open() {
    this._open = true;
    this.overlay.classList.add('open');
    this.render();
  },

  close() {
    this._open = false;
    this.overlay.classList.remove('open');
  },

  toggle() {
    this._open ? this.close() : this.open();
  },

  render() {
    if (State.history.length === 0) {
      this.list.innerHTML = `
        <div class="history-empty">
          <div class="history-empty-icon">⌚</div>
          <span>No calculations yet</span>
        </div>`;
      return;
    }

    this.list.innerHTML = State.history.map((item, idx) => {
      const time = new Date(item.time);
      const timeStr = time.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
      const isError = typeof item.result === 'string';
      return `
        <div class="history-item" data-index="${idx}">
          <div class="history-item-expr">${CalcEngine.formatExpression(item.expr)}</div>
          <div class="history-item-result" style="${isError ? 'color: var(--danger); font-size: 16px;' : ''}">
            ${isError ? 'Error: ' : '= '}${CalcEngine.formatNumber(item.result)}
          </div>
          <div class="history-item-time">${timeStr}</div>
        </div>`;
    }).join('');

    this.list.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        const item = State.history[idx];
        if (!item) return;
        if (typeof item.result === 'number') {
          State.expression = item.expr;
          State.currentInput = '';
          State.lastResult = item.result;
          State.hasResult = true;
          State.error = null;
          Display.update();
          this.close();
        }
      });
    });
  }
};


// ─── MEMORY MANAGER ───────────────────────────────────────────────

const Memory = {
  _btn: null,

  init() {
    this._btn = document.getElementById('memory-btn');
    this._btn.addEventListener('click', () => this._showMenu());
  },

  add() {
    const val = this._getCurrentValue();
    if (val !== null) {
      State.memory = (State.memory || 0) + val;
      this._save();
      Toast.show(`M+ → ${CalcEngine.formatNumber(State.memory)}`);
      Display.update();
    }
  },

  subtract() {
    const val = this._getCurrentValue();
    if (val !== null) {
      State.memory = (State.memory || 0) - val;
      this._save();
      Toast.show(`M− → ${CalcEngine.formatNumber(State.memory)}`);
      Display.update();
    }
  },

  recall() {
    if (State.memory !== null) {
      State.currentInput = State.memory.toString();
      State.hasResult = false;
      State.error = null;
      Display.update();
      Toast.show(`MR → ${CalcEngine.formatNumber(State.memory)}`);
    } else {
      Toast.show('Memory is empty');
    }
  },

  clear() {
    State.memory = null;
    this._save();
    Display.update();
    Toast.show('Memory cleared');
  },

  _getCurrentValue() {
    if (State.currentInput) return parseFloat(State.currentInput);
    if (State.lastResult !== null) return typeof State.lastResult === 'number' ? State.lastResult : null;
    return null;
  },

  _save() {
    if (State.memory !== null) {
      localStorage.setItem('nova-memory', State.memory.toString());
    } else {
      localStorage.removeItem('nova-memory');
    }
  },

  _showMenu() {
    const actions = [
      { label: 'M+', fn: () => this.add() },
      { label: 'M−', fn: () => this.subtract() },
      { label: 'MR', fn: () => this.recall() },
      { label: 'MC', fn: () => this.clear() }
    ];

    const existing = document.querySelector('.memory-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.className = 'memory-menu';
    menu.style.cssText = `
      position: absolute; top: 100%; left: 8px; z-index: 20;
      background: var(--glass-bg); backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border: 1px solid var(--glass-border); border-radius: 12px;
      padding: 4px; box-shadow: var(--glass-shadow);
      display: flex; gap: 4px;
    `;

    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.textContent = a.label;
      btn.style.cssText = `
        padding: 6px 14px; border: none; border-radius: 8px;
        background: transparent; color: var(--text-primary);
        font-family: inherit; font-size: 13px; font-weight: 500;
        cursor: pointer; transition: background 0.15s ease;
      `;
      btn.addEventListener('mouseenter', () => { btn.style.background = 'var(--accent-dim)'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
      btn.addEventListener('click', () => {
        a.fn();
        menu.remove();
      });
      menu.appendChild(btn);
    });

    this._btn.parentElement.appendChild(menu);

    const closeMenu = (e) => {
      if (!menu.contains(e.target) && e.target !== this._btn) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 50);
  }
};


// ─── CONVERTER ────────────────────────────────────────────────────

const Converter = {
  _categories: {
    length: {
      units: ['Meters', 'Kilometers', 'Miles', 'Feet', 'Inches', 'Centimeters', 'Millimeters', 'Yards'],
      base: {
        Meters: 1, Kilometers: 1000, Miles: 1609.344, Feet: 0.3048,
        Inches: 0.0254, Centimeters: 0.01, Millimeters: 0.001, Yards: 0.9144
      }
    },
    mass: {
      units: ['Kilograms', 'Grams', 'Milligrams', 'Pounds', 'Ounces', 'Tons (metric)', 'Stones'],
      base: {
        'Kilograms': 1, 'Grams': 0.001, 'Milligrams': 0.000001,
        'Pounds': 0.453592, 'Ounces': 0.0283495, 'Tons (metric)': 1000, 'Stones': 6.35029
      }
    },
    temperature: {
      units: ['Celsius', 'Fahrenheit', 'Kelvin'],
      convert(value, from, to) {
        let celsius;
        if (from === 'Celsius') celsius = value;
        else if (from === 'Fahrenheit') celsius = (value - 32) * 5 / 9;
        else celsius = value - 273.15;

        if (to === 'Celsius') return celsius;
        if (to === 'Fahrenheit') return celsius * 9 / 5 + 32;
        return celsius + 273.15;
      }
    },
    volume: {
      units: ['Liters', 'Milliliters', 'Gallons (US)', 'Quarts', 'Pints', 'Cups', 'Fluid Ounces', 'Cubic Meters'],
      base: {
        'Liters': 1, 'Milliliters': 0.001, 'Gallons (US)': 3.78541,
        'Quarts': 0.946353, 'Pints': 0.473176, 'Cups': 0.236588,
        'Fluid Ounces': 0.0295735, 'Cubic Meters': 1000
      }
    },
    area: {
      units: ['Square Meters', 'Square Kilometers', 'Square Miles', 'Square Feet', 'Acres', 'Hectares'],
      base: {
        'Square Meters': 1, 'Square Kilometers': 1000000, 'Square Miles': 2589988.11,
        'Square Feet': 0.092903, 'Acres': 4046.86, 'Hectares': 10000
      }
    },
    speed: {
      units: ['Meters/Second', 'Kilometers/Hour', 'Miles/Hour', 'Knots', 'Feet/Second'],
      base: {
        'Meters/Second': 1, 'Kilometers/Hour': 0.277778,
        'Miles/Hour': 0.44704, 'Knots': 0.514444, 'Feet/Second': 0.3048
      }
    },
    time: {
      units: ['Seconds', 'Minutes', 'Hours', 'Days', 'Weeks', 'Months (30 days)', 'Years (365 days)'],
      base: {
        'Seconds': 1, 'Minutes': 60, 'Hours': 3600, 'Days': 86400,
        'Weeks': 604800, 'Months (30 days)': 2592000, 'Years (365 days)': 31536000
      }
    },
    digital: {
      units: ['Bytes', 'Kilobytes', 'Megabytes', 'Gigabytes', 'Terabytes', 'Petabytes'],
      base: {
        'Bytes': 1, 'Kilobytes': 1024, 'Megabytes': 1048576,
        'Gigabytes': 1073741824, 'Terabytes': 1099511627776, 'Petabytes': 1125899906842624
      }
    }
  },

  _categoryEl: null,
  _fromUnitEl: null,
  _toUnitEl: null,
  _fromInput: null,
  _toInput: null,
  _swapBtn: null,
  _quickEl: null,

  init() {
    this._categoryEl = document.getElementById('conv-category');
    this._fromUnitEl = document.getElementById('conv-from-unit');
    this._toUnitEl = document.getElementById('conv-to-unit');
    this._fromInput = document.getElementById('conv-from');
    this._toInput = document.getElementById('conv-to');
    this._swapBtn = document.getElementById('conv-swap');
    this._quickEl = document.getElementById('conv-quick');

    this._populateCategories();
    this._populateUnits();

    this._categoryEl.addEventListener('change', () => {
      this._populateUnits();
      this._convert();
    });
    this._fromUnitEl.addEventListener('change', () => this._convert());
    this._toUnitEl.addEventListener('change', () => this._convert());
    this._fromInput.addEventListener('input', () => this._convert());
    this._swapBtn.addEventListener('click', () => this._swap());

    this._populateQuick();
    this._quickEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('converter-quick-btn')) {
        this._fromInput.value = e.target.dataset.value;
        this._convert();
      }
    });
  },

  _populateCategories() {
    const select = this._categoryEl;
    select.innerHTML = Object.keys(this._categories)
      .map(key => `<option value="${key}">${key.charAt(0).toUpperCase() + key.slice(1)}</option>`)
      .join('');
  },

  _populateUnits() {
    const cat = this._categoryEl.value;
    const data = this._categories[cat];
    const units = data.units || Object.keys(data.base);

    this._fromUnitEl.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
    this._toUnitEl.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');

    if (units.length > 1) {
      this._toUnitEl.selectedIndex = Math.min(1, units.length - 1);
    }

    this._toInput.value = '';
  },

  _convert() {
    const val = parseFloat(this._fromInput.value);
    if (isNaN(val)) { this._toInput.value = ''; return; }

    const cat = this._categoryEl.value;
    const from = this._fromUnitEl.value;
    const to = this._toUnitEl.value;
    const data = this._categories[cat];

    let result;
    if (data.convert) {
      result = data.convert(val, from, to);
    } else {
      const baseVal = val * (data.base[from] || 1);
      result = baseVal / (data.base[to] || 1);
    }

    this._toInput.value = CalcEngine.formatNumber(result);
  },

  _swap() {
    const fromVal = this._fromUnitEl.value;
    const toVal = this._toUnitEl.value;
    const inputVal = this._fromInput.value;

    this._fromUnitEl.value = toVal;
    this._toUnitEl.value = fromVal;
    this._fromInput.value = this._toInput.value;

    this._convert();
  },

  _populateQuick() {
    const common = [1, 10, 100, 1000];
    this._quickEl.innerHTML = common.map(v =>
      `<button class="converter-quick-btn" data-value="${v}">${v}</button>`
    ).join('');
  }
};


// ─── TOAST SYSTEM ─────────────────────────────────────────────────

const Toast = {
  _el: null,
  _timeout: null,

  init() {
    this._el = document.getElementById('toast');
  },

  show(msg, duration = 2000) {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._el.classList.remove('show');
    }
    this._el.textContent = msg;
    requestAnimationFrame(() => {
      this._el.classList.add('show');
    });
    this._timeout = setTimeout(() => {
      this._el.classList.remove('show');
    }, duration);
  }
};


// ─── UI CONTROLLER ────────────────────────────────────────────────

const UI = {
  _mode: 'basic',

  init() {
    // Mode tabs
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchMode(tab.dataset.mode));
    });

    // Keypad buttons
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this._handleButton(btn);
        this._animatePress(btn);
      });

      btn.addEventListener('touchstart', () => {
        this._animatePress(btn);
      }, { passive: true });
    });
  },

  _switchMode(mode) {
    this._mode = mode;

    document.querySelectorAll('.mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === mode);
      t.setAttribute('aria-selected', t.dataset.mode === mode ? 'true' : 'false');
    });

    document.querySelectorAll('.keypad-section').forEach(s => {
      s.classList.toggle('active', s.id === `section-${mode}`);
    });
  },

  _handleButton(btn) {
    if (btn.dataset.action) {
      this._handleAction(btn.dataset.action);
    } else if (btn.dataset.value) {
      this._inputDigit(btn.dataset.value);
    }
  },

  _handleAction(action) {
    switch (action) {
      case 'clear': this._clear(); break;
      case 'backspace': this._backspace(); break;
      case 'toggle-sign': this._toggleSign(); break;
      case 'percent': this._percent(); break;
      case 'decimal': this._inputDecimal(); break;
      case 'equals': this._evaluate(); break;
      case 'add': this._inputOperator('+'); break;
      case 'subtract': this._inputOperator('-'); break;
      case 'multiply': this._inputOperator('*'); break;
      case 'divide': this._inputOperator('/'); break;
      case 'lparen': this._inputText('('); break;
      case 'rparen': this._inputText(')'); break;
      case 'toggle-angle': this._toggleAngle(); break;

      // Scientific
      case 'sin': case 'cos': case 'tan':
      case 'log': case 'ln': case 'sqrt':
      case 'abs':
        this._inputFunction(action);
        break;

      case 'square': this._inputPostOp('²', (v) => v * v); break;
      case 'cube': this._inputPostOp('³', (v) => v * v * v); break;
      case 'power': this._inputOperator('^'); break;
      case 'ten-power': this._inputFunction('10^', (v) => Math.pow(10, v)); break;
      case 'reciprocal': this._inputPostOp('⁻¹', (v) => 1 / v); break;
      case 'factorial': this._inputPostOp('!', (v) => {
        if (v < 0 || !Number.isInteger(v) || v > 170) return NaN;
        if (v === 0 || v === 1) return 1;
        let r = 1;
        for (let i = 2; i <= v; i++) r *= i;
        return r;
      }); break;
      case 'pi': this._inputConstant(Math.PI, 'π'); break;
      case 'e': this._inputConstant(Math.E, 'e'); break;
      case 'rand': this._inputConstant(Math.random(), 'rand'); break;
      case 'inv': break; // reserved
    }
  },

  _clear() {
    State.reset();
    Display.update();
  },

  _backspace() {
    if (State.error) { State.error = null; Display.update(); return; }
    if (State.hasResult) { State.reset(); Display.update(); return; }

    if (State.currentInput) {
      State.currentInput = State.currentInput.slice(0, -1);
    } else if (State.expression) {
      State.expression = State.expression.slice(0, -1);
    }
    Display.update();
  },

  _toggleSign() {
    if (State.error) return;
    if (State.currentInput) {
      if (State.currentInput.startsWith('-')) {
        State.currentInput = State.currentInput.slice(1);
      } else {
        State.currentInput = '-' + State.currentInput;
      }
    } else if (State.lastResult !== null && State.hasResult) {
      State.currentInput = (-State.lastResult).toString();
      State.hasResult = false;
    }
    Display.update();
  },

  _percent() {
    if (State.currentInput) {
      const val = parseFloat(State.currentInput) / 100;
      State.currentInput = val.toString();
    } else if (State.lastResult !== null) {
      const val = State.lastResult / 100;
      State.currentInput = val.toString();
      State.hasResult = false;
    }
    Display.update();
  },

  _inputDigit(digit) {
    if (State.error) { State.reset(); }
    if (State.hasResult) {
      State.expression = State.lastResult.toString();
      State.currentInput = '';
      State.hasResult = false;
    }
    State.currentInput += digit;
    Display.update();
  },

  _inputDecimal() {
    if (State.error) { State.reset(); }
    if (State.hasResult) {
      State.expression = State.lastResult.toString();
      State.currentInput = '';
      State.hasResult = false;
    }
    if (!State.currentInput) {
      State.currentInput = '0.';
    } else if (!State.currentInput.includes('.')) {
      State.currentInput += '.';
    }
    Display.update();
  },

  _inputOperator(op) {
    if (State.error) return;

    if (State.hasResult && State.lastResult !== null) {
      State.expression = typeof State.lastResult === 'number' ? State.lastResult.toString() : '';
      State.currentInput = '';
      State.hasResult = false;
    }

    if (State.currentInput) {
      State.expression += State.currentInput;
      State.currentInput = '';
    }

    const lastChar = State.expression.slice(-1);
    if ('+-*/^'.includes(lastChar)) {
      State.expression = State.expression.slice(0, -1);
    }

    State.expression += op;
    Display.update();
  },

  _inputFunction(fn) {
    if (State.error) { State.reset(); }
    if (State.hasResult) {
      State.expression = State.lastResult.toString();
      State.currentInput = '';
      State.hasResult = false;
    }

    if (State.currentInput) {
      State.expression += State.currentInput;
      State.currentInput = '';
    }

    State.expression += fn + '(';
    Display.update();
  },

  _inputPostOp(label, fn) {
    if (State.error) return;

    let val;
    if (State.currentInput) {
      val = parseFloat(State.currentInput);
    } else if (State.lastResult !== null) {
      val = typeof State.lastResult === 'number' ? State.lastResult : null;
    } else {
      return;
    }

    if (val === null || isNaN(val)) return;

    const result = fn(val);
    if (!isFinite(result) || isNaN(result)) {
      State.error = 'Math error';
      Display.update();
      return;
    }

    State.currentInput = result.toString();
    State.hasResult = false;
    if (!State.expression) {
      State.expression = State.currentInput;
      State.currentInput = '';
      State.hasResult = true;
      State.lastResult = result;
    }
    Display.update();
  },

  _inputText(text) {
    if (State.error) { State.reset(); }
    if (State.hasResult && text === '(') {
      State.hasResult = false;
    }
    if (State.currentInput) {
      State.expression += State.currentInput;
      State.currentInput = '';
    }
    State.expression += text;
    Display.update();
  },

  _inputConstant(value, display) {
    if (State.error) { State.reset(); }
    if (State.hasResult) {
      State.expression = '';
      State.hasResult = false;
    }
    if (State.currentInput) {
      State.expression += State.currentInput + '*';
      State.currentInput = '';
    }
    State.currentInput = value.toString();
    Display.update();
  },

  _evaluate() {
    if (State.error) {
      State.reset();
      Display.update();
      return;
    }

    let expr = State.expression;
    if (State.currentInput) {
      expr += State.currentInput;
    }

    if (!expr) return;

    const result = CalcEngine.evaluate(expr);
    if (result && !result.error) {
      State.addHistory(expr, result.value);
      State.expression = expr;
      State.currentInput = '';
      State.lastResult = result.value;
      State.hasResult = true;
      State.error = null;
    } else {
      State.error = result.error;
      State.lastResult = null;
      State.hasResult = false;
    }

    Display.update();
    Display.animateResultChange();
  },

  _toggleAngle() {
    const mode = CalcEngine.toggleAngleMode();
    State.angleMode = mode;
    document.getElementById('angle-toggle').textContent = mode;
    Toast.show(`Angle mode: ${mode}`);
    Display.update();
  },

  _animatePress(btn) {
    btn.style.transform = 'scale(0.92)';
    setTimeout(() => {
      btn.style.transform = '';
    }, 150);
  }
};


// ─── KEYBOARD HANDLER ─────────────────────────────────────────────

const Keyboard = {
  _map: {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    '.': 'decimal', ',': 'decimal',
    'Enter': 'equals', '=': 'equals',
    'Escape': 'clear',
    'Backspace': 'backspace',
    'Delete': 'clear',
    '+': 'add', '-': 'subtract',
    '*': 'multiply', '/': 'divide',
    '%': 'percent',
    '(': 'lparen', ')': 'rparen',
    '^': 'power',
  },

  init() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      const key = e.key;

      if (key in this._map) {
        e.preventDefault();
        const action = this._map[key];

        const btn = document.querySelector(`[data-action="${action}"]`) ||
                    document.querySelector(`[data-value="${key}"]`);
        if (btn) UI._animatePress(btn);

        if (action === 'equals') {
          UI._handleAction('equals');
        } else if (['add', 'subtract', 'multiply', 'divide', 'percent', 'clear',
                    'backspace', 'decimal', 'lparen', 'rparen', 'power',
                    'toggle-sign', 'equals'].includes(action)) {
          UI._handleAction(action);
        } else {
          UI._inputDigit(key);
        }
      }

      if (key === 'h' && !e.ctrlKey && !e.metaKey) {
        HistoryUI.toggle();
      }
      if (key === 'm' && !e.ctrlKey && !e.metaKey) {
        Memory.recall();
      }
    });
  }
};


// ─── CHATBOT (Gemini AI) ─────────────────────────────────────────

const Chatbot = {
  _panel: null,
  _messages: null,
  _input: null,
  _sendBtn: null,
  _toggle: null,
  _open: false,
  _loading: false,

  init() {
    this._panel = document.getElementById('chat-panel');
    this._messages = document.getElementById('chat-messages');
    this._input = document.getElementById('chat-input');
    this._sendBtn = document.getElementById('chat-send');
    this._toggle = document.getElementById('chat-toggle');

    this._toggle.addEventListener('click', () => this.toggle());
    document.getElementById('chat-close').addEventListener('click', () => this.close());
    this._sendBtn.addEventListener('click', () => this.send());
    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.send();
    });
  },

  toggle() {
    this._open ? this.close() : this.open();
  },

  open() {
    this._open = true;
    this._panel.classList.add('open');
    this._toggle.classList.add('hidden');
    setTimeout(() => this._input.focus(), 350);
  },

  close() {
    this._open = false;
    this._panel.classList.remove('open');
    this._toggle.classList.remove('hidden');
  },

  async send() {
    const text = this._input.value.trim();
    if (!text || this._loading) return;

    this._input.value = '';
    this._addMessage(text, 'user');
    this._loading = true;
    this._sendBtn.disabled = true;

    this._addLoading();

    try {
      const response = await this._callGemini(text);
      this._removeLoading();
      this._addMessage(response, 'bot');
    } catch {
      this._removeLoading();
      this._addMessage('Sorry, I hit an error. Please try again.', 'bot');
    }

    this._loading = false;
    this._sendBtn.disabled = false;
  },

  async _callGemini(userMessage) {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyD9cPMGBla-aoI1axx3t_Dya6btIcBlwfs',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: 'You are NOVA AI, a helpful math and calculator assistant built into the NOVA calculator app. Keep responses concise, friendly, and focused on math, calculations, conversions, and related topics. Use plain text only (no markdown formatting). Be brief but helpful.'
            }]
          },
          contents: [{
            parts: [{ text: userMessage }]
          }]
        })
      }
    );

    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  },

  _addMessage(text, role) {
    const div = document.createElement('div');
    div.className = `chat-message ${role}`;
    div.innerHTML = `<div class="chat-bubble">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>`;
    this._messages.appendChild(div);
    this._scrollBottom();
  },

  _addLoading() {
    const div = document.createElement('div');
    div.className = 'chat-message bot';
    div.id = 'chat-loading';
    div.innerHTML = '<div class="chat-bubble"><span class="typing-dots">Thinking</span></div>';
    this._messages.appendChild(div);
    this._scrollBottom();
  },

  _removeLoading() {
    const el = document.getElementById('chat-loading');
    if (el) el.remove();
  },

  _scrollBottom() {
    this._messages.scrollTop = this._messages.scrollHeight;
  }
};


// ─── INIT ─────────────────────────────────────────────────────────

function init() {
  State.init();
  Theme.init();
  Display.init();
  HistoryUI.init();
  Memory.init();
  Converter.init();
  Toast.init();
  UI.init();
  Keyboard.init();
  Chatbot.init();

  Display.update();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
