const instruments = {
  forex: [
    {
      name: "EUR/USD",
      hint: "Валютная пара. Хорошо подходит для новичков из-за высокой ликвидности.",
      pointValue: 10
    },
    {
      name: "GBP/USD",
      hint: "Валютная пара. Часто двигается резче, чем EUR/USD.",
      pointValue: 10
    },
    {
      name: "USD/JPY",
      hint: "Валютная пара с японской иеной. Может активно реагировать на новости.",
      pointValue: 7
    }
  ],

  metals: [
    {
      name: "XAU/USD — Золото",
      hint: "Золото часто двигается резко. Очень важно следить за новостями и стопом.",
      pointValue: 1
    },
    {
      name: "XAG/USD — Серебро",
      hint: "Серебро может быть резким и менее спокойным, чем основные валютные пары.",
      pointValue: 5
    }
  ],

  indices: [
    {
      name: "US100 — Nasdaq",
      hint: "Индекс технологических компаний. Может быстро двигаться на новостях США.",
      pointValue: 1
    },
    {
      name: "US30 — Dow Jones",
      hint: "Индекс крупных компаний США. Важны новости и сессия США.",
      pointValue: 1
    },
    {
      name: "GER40 — DAX",
      hint: "Немецкий индекс. Активнее двигается во время европейской сессии.",
      pointValue: 1
    }
  ],

  crypto: [
    {
      name: "BTC/USD — Bitcoin",
      hint: "Крипто может резко двигаться даже без новости. Риск выше.",
      pointValue: 1
    },
    {
      name: "ETH/USD — Ethereum",
      hint: "Криптоинструмент. Может быть высокая волатильность.",
      pointValue: 1
    }
  ]
};

const categoryEl = document.getElementById("category");
const instrumentEl = document.getElementById("instrument");
const instrumentHintEl = document.getElementById("instrumentHint");

const analysisModeEl = document.getElementById("analysisMode");
const simpleModeEl = document.getElementById("simpleMode");
const advancedModeEl = document.getElementById("advancedMode");

const decisionTitleEl = document.getElementById("decisionTitle");
const decisionTextEl = document.getElementById("decisionText");
const scoreCircleEl = document.getElementById("scoreCircle");
const longBarEl = document.getElementById("longBar");
const shortBarEl = document.getElementById("shortBar");
const longScoreEl = document.getElementById("longScore");
const shortScoreEl = document.getElementById("shortScore");
const reasonsListEl = document.getElementById("reasonsList");

const balanceEl = document.getElementById("balance");
const riskPercentEl = document.getElementById("riskPercent");
const stopPointsEl = document.getElementById("stopPoints");
const pointValueEl = document.getElementById("pointValue");
const riskMoneyEl = document.getElementById("riskMoney");
const lotSizeEl = document.getElementById("lotSize");

function getValue(id) {
  return document.getElementById(id).value;
}

function fillInstruments() {
  const category = categoryEl.value;

  instrumentEl.innerHTML = "";

  instruments[category].forEach((item, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = item.name;
    instrumentEl.appendChild(option);
  });

  updateInstrumentInfo();
}

function getCurrentInstrument() {
  const category = categoryEl.value;
  const index = Number(instrumentEl.value);

  return instruments[category][index];
}

function updateInstrumentInfo() {
  const item = getCurrentInstrument();

  instrumentHintEl.textContent = item.hint;
  pointValueEl.value = item.pointValue;

  calculateRisk();
}

function toggleAnalysisMode() {
  const mode = analysisModeEl.value;

  if (mode === "simple") {
    simpleModeEl.classList.remove("hidden");
    advancedModeEl.classList.add("hidden");
  } else {
    simpleModeEl.classList.add("hidden");
    advancedModeEl.classList.remove("hidden");
  }

  analyzeTrade();
  updateAllPatterns();
}

function addReason(reasons, text) {
  reasons.push(text);
}

function analyzeTrade() {
  let longScore = 0;
  let shortScore = 0;

  const maxScore = 12;

  let blocked = false;
  let blockReason = "";

  const reasons = [];

  const mode = analysisModeEl.value;
  const news = getValue("news");
  const spread = getValue("spread");
  const rr = Number(getValue("rr"));

  if (mode === "simple") {
    const priceMove = getValue("priceMove");
    const candleMix = getValue("candleMix");
    const lastCandleSimple = getValue("lastCandleSimple");
    const priceState = getValue("priceState");

    if (priceMove === "up") {
      longScore += 2;
      addReason(reasons, "Цена больше идёт вверх — плюс для Long.");
    }

    if (priceMove === "down") {
      shortScore += 2;
      addReason(reasons, "Цена больше идёт вниз — плюс для Short.");
    }

    if (priceMove === "flat") {
      longScore -= 1;
      shortScore -= 1;
      addReason(reasons, "Цена ходит туда-сюда — направление слабое.");
    }

    if (priceMove === "unclear") {
      addReason(reasons, "Направление цены непонятное — лучше быть осторожнее.");
    }

    if (candleMix === "green") {
      longScore += 1;
      addReason(reasons, "Среди последних свечей зелёных больше — небольшой плюс для Long.");
    }

    if (candleMix === "red") {
      shortScore += 1;
      addReason(reasons, "Среди последних свечей красных больше — небольшой плюс для Short.");
    }

    if (candleMix === "mixed") {
      addReason(reasons, "Зелёные и красные свечи примерно поровну — ясного преимущества нет.");
    }

    if (lastCandleSimple === "bull") {
      longScore += 2;
      addReason(reasons, "Последняя свеча большая зелёная — плюс для Long.");
    }

    if (lastCandleSimple === "bear") {
      shortScore += 2;
      addReason(reasons, "Последняя свеча большая красная — плюс для Short.");
    }

    if (lastCandleSimple === "tailDown") {
      longScore += 2;
      addReason(reasons, "Был хвост вниз, потом цена пошла вверх — плюс для Long.");
    }

    if (lastCandleSimple === "tailUp") {
      shortScore += 2;
      addReason(reasons, "Был хвост вверх, потом цена пошла вниз — плюс для Short.");
    }

    if (lastCandleSimple === "doji") {
      longScore -= 1;
      shortScore -= 1;
      addReason(reasons, "Свеча почти как крестик — рынок сомневается.");
    }

    if (lastCandleSimple === "small") {
      addReason(reasons, "Последняя свеча маленькая или непонятная.");
    }

    if (priceState === "afterRise") {
      shortScore += 1;
      addReason(reasons, "Цена уже сильно выросла — вход в Long может быть поздним.");
    }

    if (priceState === "afterDrop") {
      longScore += 1;
      addReason(reasons, "Цена уже сильно упала — вход в Short может быть поздним.");
    }

    if (priceState === "middle") {
      addReason(reasons, "По силе движения ничего особенного.");
    }

    if (priceState === "unknown") {
      addReason(reasons, "Ты не уверен, где сейчас цена — сигнал будет осторожнее.");
    }
  }

  if (mode === "advanced") {
    const trend = getValue("trend");
    const ema = getValue("ema");
    const level = getValue("level");
    const candle = getValue("candle");
    const rsi = getValue("rsi");
    const volume = getValue("volume");

    if (trend === "up") {
      longScore += 2;
      addReason(reasons, "Цена больше идёт вверх — плюс для Long.");
    }

    if (trend === "down") {
      shortScore += 2;
      addReason(reasons, "Цена больше идёт вниз — плюс для Short.");
    }

    if (trend === "flat") {
      longScore -= 1;
      shortScore -= 1;
      addReason(reasons, "Цена ходит туда-сюда — вход слабее.");
    }

    if (trend === "unclear") {
      addReason(reasons, "Направление цены непонятное — лучше быть осторожнее.");
    }

    if (ema === "above") {
      longScore += 1;
      addReason(reasons, "Цена выше средней линии — небольшой плюс для Long.");
    }

    if (ema === "below") {
      shortScore += 1;
      addReason(reasons, "Цена ниже средней линии — небольшой плюс для Short.");
    }

    if (ema === "near") {
      addReason(reasons, "Цена рядом со средней линией — сильного направления пока нет.");
    }

    if (level === "support") {
      longScore += 2;
      addReason(reasons, "Цена снизу оттолкнулась вверх — плюс для Long.");
    }

    if (level === "resistance") {
      shortScore += 2;
      addReason(reasons, "Цена сверху оттолкнулась вниз — плюс для Short.");
    }

    if (level === "breakoutUp") {
      longScore += 2;
      addReason(reasons, "Цена пробила вверх — плюс для Long.");
    }

    if (level === "breakoutDown") {
      shortScore += 2;
      addReason(reasons, "Цена пробила вниз — плюс для Short.");
    }

    if (level === "middle") {
      addReason(reasons, "Цена не возле важного места — вход менее понятный.");
    }

    if (candle === "bull") {
      longScore += 2;
      addReason(reasons, "Большая зелёная свеча — плюс для Long.");
    }

    if (candle === "bear") {
      shortScore += 2;
      addReason(reasons, "Большая красная свеча — плюс для Short.");
    }

    if (candle === "pinBull") {
      longScore += 2;
      addReason(reasons, "Был хвост вниз, потом цена пошла вверх — плюс для Long.");
    }

    if (candle === "pinBear") {
      shortScore += 2;
      addReason(reasons, "Был хвост вверх, потом цена пошла вниз — плюс для Short.");
    }

    if (candle === "doji") {
      longScore -= 1;
      shortScore -= 1;
      addReason(reasons, "Свеча как крестик — рынок сомневается.");
    }

    if (candle === "weak") {
      addReason(reasons, "Последняя свеча маленькая или непонятная.");
    }

    if (rsi === "low") {
      longScore += 1;
      addReason(reasons, "RSI внизу — цена уже сильно продавлена. Возможен отскок вверх.");
    }

    if (rsi === "high") {
      shortScore += 1;
      addReason(reasons, "RSI вверху — цена уже сильно разогнана. Возможен откат вниз.");
    }

    if (rsi === "bullDiv") {
      longScore += 2;
      addReason(reasons, "Цена падает, но RSI уже поднимается — возможный плюс для Long.");
    }

    if (rsi === "bearDiv") {
      shortScore += 2;
      addReason(reasons, "Цена растёт, но RSI уже падает — возможный плюс для Short.");
    }

    if (rsi === "normal") {
      addReason(reasons, "RSI без сильного предупреждения.");
    }

    if (rsi === "unknown") {
      addReason(reasons, "RSI не используется — это нормально.");
    }

    if (volume === "confirmUp") {
      longScore += 1;
      addReason(reasons, "Вверх идёт уверенно — плюс для Long.");
    }

    if (volume === "confirmDown") {
      shortScore += 1;
      addReason(reasons, "Вниз идёт уверенно — плюс для Short.");
    }

    if (volume === "low") {
      longScore -= 1;
      shortScore -= 1;
      addReason(reasons, "Движение слабое — сигнал хуже.");
    }

    if (volume === "normal") {
      addReason(reasons, "Движение обычное.");
    }

    if (volume === "unknown") {
      addReason(reasons, "Сила движения не используется — это нормально.");
    }
  }

  if (news === "soon") {
    longScore -= 2;
    shortScore -= 2;
    addReason(reasons, "Новости не проверены или скоро важная новость — лучше уменьшить риск или пропустить.");
  }

  if (news === "high") {
    blocked = true;
    blockReason = "Цена уже резко прыгает.";
    addReason(reasons, "Когда цена резко прыгает, подсказка Long/Short ненадёжна.");
  }

  if (spread === "high") {
    blocked = true;
    blockReason = "Спред высокий.";
    addReason(reasons, "Высокий спред ухудшает вход и может быстро выбить стоп.");
  }

  if (rr < 1.5) {
    longScore -= 1;
    shortScore -= 1;
    addReason(reasons, "Риск/прибыль слабый. Лучше искать хотя бы 1 к 1.5 или 1 к 2.");
  }

  if (rr >= 2) {
    longScore += 1;
    shortScore += 1;
    addReason(reasons, "Риск/прибыль хороший — это плюс к качеству сделки.");
  }

  longScore = Math.max(0, longScore);
  shortScore = Math.max(0, shortScore);

  const difference = Math.abs(longScore - shortScore);
  const bestScore = Math.max(longScore, shortScore);

  let title = "";
  let text = "";
  let score = 0;
  let statusClass = "neutral";

  if (blocked) {
    title = "Лучше пропустить";
    text = blockReason + " В таких условиях подсказка Long/Short ненадёжна.";
    score = 0;
    statusClass = "bad";
  } else if (bestScore < 4) {
    title = "Сигнал слабый";
    text = "Условия недостаточно понятные. Лучше не входить наугад.";
    score = bestScore;
    statusClass = "neutral";
  } else if (difference < 2) {
    title = "Рынок непонятный";
    text = "Long и Short почти равны по баллам. Лучше дождаться более ясной ситуации.";
    score = bestScore;
    statusClass = "neutral";
  } else if (longScore > shortScore) {
    title = "Long выглядит сильнее";
    text = "По чек-листу больше условий в сторону роста. Это не гарантия, вход только со стопом.";
    score = longScore;
    statusClass = "good";
  } else {
    title = "Short выглядит сильнее";
    text = "По чек-листу больше условий в сторону падения. Это не гарантия, вход только со стопом.";
    score = shortScore;
    statusClass = "bad";
  }

  renderTradeResult({
    title,
    text,
    score,
    maxScore,
    longScore,
    shortScore,
    reasons,
    statusClass
  });
}

function renderTradeResult(data) {
  decisionTitleEl.textContent = data.title;
  decisionTextEl.textContent = data.text;

  decisionTitleEl.className = "";
  decisionTitleEl.classList.add(data.statusClass);

  scoreCircleEl.textContent = data.score;

  const longPercent = Math.min(100, (data.longScore / data.maxScore) * 100);
  const shortPercent = Math.min(100, (data.shortScore / data.maxScore) * 100);

  longBarEl.style.width = longPercent + "%";
  shortBarEl.style.width = shortPercent + "%";

  longScoreEl.textContent = data.longScore + " баллов";
  shortScoreEl.textContent = data.shortScore + " баллов";

  reasonsListEl.innerHTML = "";

  data.reasons.forEach((reason) => {
    const li = document.createElement("li");
    li.textContent = reason;
    reasonsListEl.appendChild(li);
  });
}

function calculateRisk() {
  const balance = Number(balanceEl.value);
  const riskPercent = Number(riskPercentEl.value);
  const stopPoints = Number(stopPointsEl.value);
  const pointValue = Number(pointValueEl.value);

  if (balance <= 0 || riskPercent <= 0 || stopPoints <= 0 || pointValue <= 0) {
    riskMoneyEl.textContent = "$0.00";
    lotSizeEl.textContent = "0.00";
    return;
  }

  const riskMoney = balance * riskPercent / 100;
  const lotSize = riskMoney / (stopPoints * pointValue);

  riskMoneyEl.textContent = "$" + riskMoney.toFixed(2);
  lotSizeEl.textContent = lotSize.toFixed(2);
}

function makePattern(title, text, svg) {
  return `
    <div class="pattern-title">${title}</div>
    <div class="pattern-text">${text}</div>
    ${svg}
  `;
}

function gridSvg(content) {
  return `
    <svg viewBox="0 0 320 110" aria-hidden="true">
      <line class="pattern-grid-line" x1="0" y1="25" x2="320" y2="25"></line>
      <line class="pattern-grid-line" x1="0" y1="55" x2="320" y2="55"></line>
      <line class="pattern-grid-line" x1="0" y1="85" x2="320" y2="85"></line>
      ${content}
    </svg>
  `;
}

function candleSvg(x, colorClass, bodyY, bodyH, wickTop, wickBottom) {
  return `
    <line class="pattern-candle-line ${colorClass}" x1="${x}" y1="${wickTop}" x2="${x}" y2="${wickBottom}"></line>
    <rect class="pattern-candle-body ${colorClass}" x="${x - 13}" y="${bodyY}" width="26" height="${bodyH}"></rect>
  `;
}

function rsiSvg(priceColor, pricePoints, rsiColor, rsiPoints, extraLines = "") {
  return `
    <svg viewBox="0 0 320 130" aria-hidden="true">
      <line class="pattern-grid-line" x1="0" y1="24" x2="320" y2="24"></line>
      <line class="pattern-grid-line" x1="0" y1="54" x2="320" y2="54"></line>
      <line class="pattern-grid-line" x1="0" y1="84" x2="320" y2="84"></line>
      <line class="pattern-grid-line" x1="0" y1="114" x2="320" y2="114"></line>

      <text x="16" y="19" font-size="12" fill="#64748b" font-weight="700">Цена</text>
      <polyline class="pattern-line ${priceColor}" points="${pricePoints}"></polyline>

      <text x="16" y="79" font-size="12" fill="#64748b" font-weight="700">RSI</text>
      ${extraLines}
      <polyline class="pattern-line ${rsiColor}" points="${rsiPoints}"></polyline>
    </svg>
  `;
}

const simplePatterns = {
  priceMove: {
    unclear: makePattern(
      "Не понимаю",
      "Цена идёт непонятно. Лучше не спешить.",
      gridSvg(`
        <polyline class="pattern-line pattern-gray" points="20,60 60,45 100,70 140,50 180,65 220,40 260,63 300,55"></polyline>
      `)
    ),

    up: makePattern(
      "Больше вверх",
      "Цена постепенно поднимается. Это больше похоже на Long.",
      gridSvg(`
        <polyline class="pattern-line pattern-green" points="20,85 70,72 120,60 170,45 220,35 300,20"></polyline>
      `)
    ),

    down: makePattern(
      "Больше вниз",
      "Цена постепенно падает. Это больше похоже на Short.",
      gridSvg(`
        <polyline class="pattern-line pattern-red" points="20,25 70,38 120,50 170,65 220,76 300,92"></polyline>
      `)
    ),

    flat: makePattern(
      "Туда-сюда",
      "Цена ходит в стороны. Направление слабое.",
      gridSvg(`
        <polyline class="pattern-line pattern-yellow" points="20,55 60,42 100,66 140,45 180,68 220,44 260,66 300,52"></polyline>
      `)
    )
  },

  candleMix: {
    mixed: makePattern(
      "Смешанные",
      "Зелёные и красные примерно поровну. Ясного преимущества нет.",
      gridSvg(`
        ${candleSvg(55, "pattern-green", 48, 26, 34, 84)}
        ${candleSvg(110, "pattern-red", 44, 30, 28, 82)}
        ${candleSvg(165, "pattern-green", 50, 22, 36, 84)}
        ${candleSvg(220, "pattern-red", 46, 28, 32, 86)}
        <line class="pattern-candle-line pattern-gray" x1="275" y1="38" x2="275" y2="78"></line>
        <rect class="pattern-candle-body" x="262" y="52" width="26" height="16" fill="#94a3b8"></rect>
      `)
    ),

    green: makePattern(
      "Больше зелёных",
      "Среди последних свечей зелёных больше. Это небольшой плюс для Long.",
      gridSvg(`
        ${candleSvg(45, "pattern-green", 50, 26, 34, 84)}
        ${candleSvg(100, "pattern-green", 44, 32, 28, 82)}
        ${candleSvg(155, "pattern-red", 48, 24, 32, 82)}
        ${candleSvg(210, "pattern-green", 42, 34, 25, 82)}
        ${candleSvg(265, "pattern-green", 47, 29, 31, 84)}
      `)
    ),

    red: makePattern(
      "Больше красных",
      "Среди последних свечей красных больше. Это небольшой плюс для Short.",
      gridSvg(`
        ${candleSvg(45, "pattern-red", 42, 34, 25, 84)}
        ${candleSvg(100, "pattern-red", 47, 29, 30, 86)}
        ${candleSvg(155, "pattern-green", 50, 22, 34, 82)}
        ${candleSvg(210, "pattern-red", 44, 32, 28, 85)}
        ${candleSvg(265, "pattern-red", 49, 25, 32, 88)}
      `)
    )
  },

  lastCandleSimple: {
    small: makePattern(
      "Маленькая свеча",
      "Свеча слабая. По ней одной лучше не решать.",
      gridSvg(`
        <line class="pattern-candle-line pattern-gray" x1="160" y1="35" x2="160" y2="75"></line>
        <rect class="pattern-candle-body" x="145" y="50" width="30" height="12" fill="#94a3b8"></rect>
      `)
    ),

    bull: makePattern(
      "Большая зелёная",
      "Покупатели сильнее. Это плюс для Long.",
      gridSvg(`
        <line class="pattern-candle-line pattern-green" x1="160" y1="18" x2="160" y2="92"></line>
        <rect class="pattern-candle-body pattern-green" x="135" y="35" width="50" height="42"></rect>
      `)
    ),

    bear: makePattern(
      "Большая красная",
      "Продавцы сильнее. Это плюс для Short.",
      gridSvg(`
        <line class="pattern-candle-line pattern-red" x1="160" y1="18" x2="160" y2="92"></line>
        <rect class="pattern-candle-body pattern-red" x="135" y="35" width="50" height="42"></rect>
      `)
    ),

    tailDown: makePattern(
      "Хвост вниз",
      "Цена сходила вниз, но её выкупили. Это плюс для Long.",
      gridSvg(`
        <line class="pattern-candle-line pattern-green" x1="160" y1="25" x2="160" y2="95"></line>
        <rect class="pattern-candle-body pattern-green" x="140" y="35" width="40" height="22"></rect>
      `)
    ),

    tailUp: makePattern(
      "Хвост вверх",
      "Цена сходила вверх, но её продавили вниз. Это плюс для Short.",
      gridSvg(`
        <line class="pattern-candle-line pattern-red" x1="160" y1="15" x2="160" y2="85"></line>
        <rect class="pattern-candle-body pattern-red" x="140" y="58" width="40" height="22"></rect>
      `)
    ),

    doji: makePattern(
      "Свеча как крестик",
      "Рынок сомневается. Лучше быть осторожнее.",
      gridSvg(`
        <line class="pattern-candle-line pattern-gray" x1="160" y1="25" x2="160" y2="85"></line>
        <line class="pattern-candle-line pattern-gray" x1="130" y1="55" x2="190" y2="55"></line>
      `)
    )
  },

  priceState: {
    unknown: makePattern(
      "Не понимаю",
      "Если непонятно, лучше не торопиться.",
      gridSvg(`
        <polyline class="pattern-line pattern-gray" points="20,60 60,45 100,70 140,50 180,65 220,40 260,63 300,55"></polyline>
      `)
    ),

    afterRise: makePattern(
      "Цена сильно выросла",
      "На рисунке видно: цена долго шла вверх. После такого вход в Long может быть поздним.",
      gridSvg(`
        <polyline class="pattern-line pattern-green" points="25,88 65,80 105,72 145,60 185,48 225,35 265,25 300,18"></polyline>
      `)
    ),

    afterDrop: makePattern(
      "Цена сильно упала",
      "На рисунке видно: цена долго шла вниз. После такого вход в Short может быть поздним.",
      gridSvg(`
        <polyline class="pattern-line pattern-red" points="25,20 65,30 105,40 145,53 185,66 225,78 265,88 300,94"></polyline>
      `)
    ),

    middle: makePattern(
      "Ничего особенного",
      "Сильного роста или падения сейчас не видно.",
      gridSvg(`
        <polyline class="pattern-line pattern-gray" points="20,56 70,52 120,58 170,54 220,59 270,52 300,56"></polyline>
      `)
    )
  }
};

const advancedPatterns = {
  trend: simplePatterns.priceMove,

  ema: {
    near: makePattern(
      "Рядом с линией",
      "Цена рядом со средней линией. Направление пока слабое.",
      gridSvg(`
        <polyline class="pattern-line pattern-yellow" points="20,55 80,55 140,55 200,55 260,55 300,55"></polyline>
        <polyline class="pattern-line pattern-gray" points="20,60 70,48 120,66 170,50 220,63 270,51 300,59"></polyline>
      `)
    ),

    above: makePattern(
      "Выше линии",
      "Цена выше средней линии. Это небольшой плюс для Long.",
      gridSvg(`
        <polyline class="pattern-line pattern-yellow" points="20,78 80,73 140,68 200,63 260,58 300,54"></polyline>
        <polyline class="pattern-line pattern-green" points="20,55 80,46 140,42 200,36 260,30 300,25"></polyline>
      `)
    ),

    below: makePattern(
      "Ниже линии",
      "Цена ниже средней линии. Это небольшой плюс для Short.",
      gridSvg(`
        <polyline class="pattern-line pattern-yellow" points="20,34 80,38 140,43 200,48 260,53 300,58"></polyline>
        <polyline class="pattern-line pattern-red" points="20,55 80,63 140,70 200,78 260,86 300,92"></polyline>
      `)
    )
  },

  level: {
    middle: makePattern(
      "Просто посередине",
      "Цена не возле важного места. Вход менее понятный.",
      gridSvg(`
        <polyline class="pattern-line pattern-gray" points="20,62 70,48 120,66 170,52 220,59 270,46 300,58"></polyline>
      `)
    ),

    support: makePattern(
      "Оттолкнулась снизу вверх",
      "Цена была внизу, коснулась важного места и пошла вверх.",
      gridSvg(`
        <line class="pattern-blue" x1="20" y1="82" x2="300" y2="82" stroke-width="3" stroke-dasharray="7 7"></line>
        <polyline class="pattern-line pattern-green" points="25,45 80,75 130,82 180,58 230,40 300,28"></polyline>
      `)
    ),

    resistance: makePattern(
      "Оттолкнулась сверху вниз",
      "Цена была вверху, коснулась важного места и пошла вниз.",
      gridSvg(`
        <line class="pattern-blue" x1="20" y1="28" x2="300" y2="28" stroke-width="3" stroke-dasharray="7 7"></line>
        <polyline class="pattern-line pattern-red" points="25,75 80,45 130,28 180,50 230,68 300,84"></polyline>
      `)
    ),

    breakoutUp: makePattern(
      "Пробила вверх",
      "Цена прошла через важное место вверх. Это плюс для Long.",
      gridSvg(`
        <line class="pattern-blue" x1="20" y1="55" x2="300" y2="55" stroke-width="3" stroke-dasharray="7 7"></line>
        <polyline class="pattern-line pattern-green" points="25,82 80,70 130,60 175,52 220,35 300,22"></polyline>
      `)
    ),

    breakoutDown: makePattern(
      "Пробила вниз",
      "Цена прошла через важное место вниз. Это плюс для Short.",
      gridSvg(`
        <line class="pattern-blue" x1="20" y1="55" x2="300" y2="55" stroke-width="3" stroke-dasharray="7 7"></line>
        <polyline class="pattern-line pattern-red" points="25,25 80,38 130,50 175,58 220,74 300,88"></polyline>
      `)
    )
  },

  candle: {
    weak: simplePatterns.lastCandleSimple.small,
    bull: simplePatterns.lastCandleSimple.bull,
    bear: simplePatterns.lastCandleSimple.bear,
    pinBull: simplePatterns.lastCandleSimple.tailDown,
    pinBear: simplePatterns.lastCandleSimple.tailUp,
    doji: simplePatterns.lastCandleSimple.doji
  },

  rsi: {
    unknown: makePattern(
      "RSI не используем",
      "Если не знаешь RSI, можно оставить так. Калькулятор всё равно работает.",
      rsiSvg(
        "pattern-gray",
        "70,28 115,34 160,29 205,36 250,31 300,35",
        "pattern-gray",
        "70,92 115,87 160,96 205,89 250,98 300,91"
      )
    ),

    low: makePattern(
      "Цена сильно упала",
      "RSI внизу. Цена уже сильно продавлена.",
      rsiSvg(
        "pattern-red",
        "70,22 115,30 160,38 205,46 250,53 300,58",
        "pattern-red",
        "70,96 115,102 160,108 205,106 250,103 300,100",
        `<line class="pattern-blue" x1="70" y1="110" x2="300" y2="110" stroke-width="2" stroke-dasharray="6 6"></line>`
      )
    ),

    normal: makePattern(
      "Ничего особенного",
      "RSI не показывает сильного предупреждения.",
      rsiSvg(
        "pattern-yellow",
        "70,40 115,32 160,39 205,33 250,40 300,35",
        "pattern-yellow",
        "70,94 115,88 160,96 205,90 250,98 300,92",
        `
          <line class="pattern-blue" x1="70" y1="82" x2="300" y2="82" stroke-width="2" stroke-dasharray="6 6"></line>
          <line class="pattern-blue" x1="70" y1="112" x2="300" y2="112" stroke-width="2" stroke-dasharray="6 6"></line>
        `
      )
    ),

    high: makePattern(
      "Цена сильно выросла",
      "RSI вверху. Цена уже сильно разогнана.",
      rsiSvg(
        "pattern-green",
        "70,58 115,50 160,42 205,34 250,27 300,20",
        "pattern-green",
        "70,106 115,98 160,90 205,84 250,78 300,76",
        `<line class="pattern-blue" x1="70" y1="82" x2="300" y2="82" stroke-width="2" stroke-dasharray="6 6"></line>`
      )
    ),

    bullDiv: makePattern(
      "Индикатор хочет вверх",
      "Цена падает, но RSI уже поднимается. Возможен разворот вверх.",
      rsiSvg(
        "pattern-red",
        "70,20 115,28 160,36 205,44 250,52 300,58",
        "pattern-green",
        "70,110 115,104 160,98 205,92 250,86 300,80"
      )
    ),

    bearDiv: makePattern(
      "Индикатор хочет вниз",
      "Цена растёт, но RSI уже падает. Возможен разворот вниз.",
      rsiSvg(
        "pattern-green",
        "70,58 115,50 160,42 205,34 250,27 300,20",
        "pattern-red",
        "70,80 115,86 160,92 205,98 250,104 300,110"
      )
    )
  },

  volume: {
    unknown: makePattern(
      "Силу движения не смотрим",
      "Если не понимаешь силу движения, можно оставить так.",
      gridSvg(`
        <rect x="45" y="72" width="24" height="20" fill="#94a3b8"></rect>
        <rect x="95" y="62" width="24" height="30" fill="#94a3b8"></rect>
        <rect x="145" y="68" width="24" height="24" fill="#94a3b8"></rect>
        <rect x="195" y="58" width="24" height="34" fill="#94a3b8"></rect>
        <rect x="245" y="65" width="24" height="27" fill="#94a3b8"></rect>
      `)
    ),

    normal: makePattern(
      "Обычное движение",
      "Движение нормальное, без явного усиления.",
      gridSvg(`
        <rect x="45" y="66" width="24" height="26" fill="#f59e0b"></rect>
        <rect x="95" y="62" width="24" height="30" fill="#f59e0b"></rect>
        <rect x="145" y="65" width="24" height="27" fill="#f59e0b"></rect>
        <rect x="195" y="61" width="24" height="31" fill="#f59e0b"></rect>
        <rect x="245" y="64" width="24" height="28" fill="#f59e0b"></rect>
      `)
    ),

    low: makePattern(
      "Движение слабое",
      "Свечи маленькие. Сигнал хуже.",
      gridSvg(`
        <rect x="45" y="82" width="24" height="10" fill="#fb923c"></rect>
        <rect x="95" y="79" width="24" height="13" fill="#fb923c"></rect>
        <rect x="145" y="84" width="24" height="8" fill="#fb923c"></rect>
        <rect x="195" y="80" width="24" height="12" fill="#fb923c"></rect>
        <rect x="245" y="83" width="24" height="9" fill="#fb923c"></rect>
      `)
    ),

    confirmUp: makePattern(
      "Вверх идёт уверенно",
      "Зелёные свечи становятся сильнее. Это плюс для Long.",
      gridSvg(`
        ${candleSvg(55, "pattern-green", 66, 18, 55, 92)}
        ${candleSvg(110, "pattern-green", 58, 24, 48, 92)}
        ${candleSvg(165, "pattern-green", 48, 32, 38, 90)}
        ${candleSvg(220, "pattern-green", 38, 42, 28, 88)}
      `)
    ),

    confirmDown: makePattern(
      "Вниз идёт уверенно",
      "Красные свечи становятся сильнее. Это плюс для Short.",
      gridSvg(`
        ${candleSvg(55, "pattern-red", 34, 18, 20, 66)}
        ${candleSvg(110, "pattern-red", 40, 24, 24, 74)}
        ${candleSvg(165, "pattern-red", 48, 32, 30, 84)}
        ${candleSvg(220, "pattern-red", 56, 42, 38, 94)}
      `)
    )
  }
};

function updatePattern(selectId, patternId, source) {
  const select = document.getElementById(selectId);
  const box = document.getElementById(patternId);

  if (!select || !box) return;

  const group = source[selectId];
  const value = select.value;

  if (!group || !group[value]) return;

  box.innerHTML = group[value];
}

function updateAllPatterns() {
  updatePattern("priceMove", "priceMovePattern", simplePatterns);
  updatePattern("candleMix", "candleMixPattern", simplePatterns);
  updatePattern("lastCandleSimple", "lastCandleSimplePattern", simplePatterns);
  updatePattern("priceState", "priceStatePattern", simplePatterns);

  updatePattern("trend", "trendPattern", advancedPatterns);
  updatePattern("ema", "emaPattern", advancedPatterns);
  updatePattern("level", "levelPattern", advancedPatterns);
  updatePattern("candle", "candlePattern", advancedPatterns);
  updatePattern("rsi", "rsiPattern", advancedPatterns);
  updatePattern("volume", "volumePattern", advancedPatterns);
}

categoryEl.addEventListener("change", fillInstruments);
instrumentEl.addEventListener("change", updateInstrumentInfo);
analysisModeEl.addEventListener("change", toggleAnalysisMode);

[
  balanceEl,
  riskPercentEl,
  stopPointsEl,
  pointValueEl
].forEach((input) => {
  input.addEventListener("input", calculateRisk);
});

document.querySelectorAll("select").forEach((select) => {
  select.addEventListener("change", function () {
    calculateRisk();
    analyzeTrade();
    updateAllPatterns();
  });
});

fillInstruments();
toggleAnalysisMode();
analyzeTrade();
calculateRisk();
updateAllPatterns();