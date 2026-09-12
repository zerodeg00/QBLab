/**
 * 백테스트 차트 렌더러
 * TradingView Lightweight Charts v4 기반
 * - 가격 차트: BTC/USDT 일봉 + 매매 마커
 * - Equity 곡선: 누적 수익 (로그 스케일)
 */
(async function () {
  'use strict';

  var DATA_URL = '/data/backtest-binance.json';

  // ────────── 유틸리티 ──────────

  function formatKRW(value) {
    var abs = Math.abs(value);
    var sign = value < 0 ? '-' : '';
    if (abs >= 1e12) return sign + (abs / 1e12).toFixed(1) + '조';
    if (abs >= 1e8) {
      var v = abs / 1e8;
      return sign + (v >= 10 ? Math.round(v).toLocaleString() : v.toFixed(1)) + '억';
    }
    if (abs >= 1e4) return sign + Math.round(abs / 1e4).toLocaleString() + '만';
    return sign + Math.round(abs).toLocaleString() + '원';
  }

  // ────────── 데이터 로드 ──────────

  var data;
  try {
    var resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    data = await resp.json();
  } catch (err) {
    document.getElementById('price-chart').innerHTML =
      '<div class="chart-error">' +
      '차트 데이터를 불러올 수 없습니다.<br>' +
      '<code>python scripts/export_backtest_chart.py</code> 를 먼저 실행해주세요.' +
      '</div>';
    return;
  }

  // ────────── Stats 카드 ──────────

  var s = data.stats.combined;
  document.getElementById('stats-container').innerHTML =
    '<div class="stat-card"><div class="label">월평균 수익률</div>' +
    '<div class="value pos">+' + ((Math.pow(s.roi_pct / 100 + 1, 1 / s.total_months) - 1) * 100).toFixed(1) + '%</div></div>' +
    '<div class="stat-card"><div class="label">MDD</div>' +
    '<div class="value neg">' + s.mdd_pct.toFixed(2) + '%</div></div>' +
    '<div class="stat-card"><div class="label">Sharpe</div>' +
    '<div class="value">' + s.sharpe.toFixed(2) + '</div></div>' +
    '<div class="stat-card"><div class="label">총 거래</div>' +
    '<div class="value">' + s.trades.toLocaleString() + '건</div></div>' +
    '<div class="stat-card"><div class="label">승률</div>' +
    '<div class="value">' + s.win_rate.toFixed(1) + '%</div></div>' +
    '<div class="stat-card"><div class="label">손실월</div>' +
    '<div class="value">' + s.loss_months + ' / ' + s.total_months + '</div></div>';

  // ────────── 가격 차트 ──────────

  var priceEl = document.getElementById('price-chart');
  priceEl.innerHTML = '';
  var priceChart = LightweightCharts.createChart(priceEl, {
    autoSize: true,
    layout: {
      background: { color: '#ffffff' },
      textColor: '#333333',
      fontFamily: "'Maru Buri', sans-serif",
    },
    grid: {
      vertLines: { color: '#f0f0f0' },
      horzLines: { color: '#f0f0f0' },
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: {
      borderColor: '#e0e0e0',
      scaleMargins: { top: 0.05, bottom: 0.05 },
    },
    timeScale: {
      borderColor: '#e0e0e0',
      timeVisible: false,
      rightOffset: 12,
    },
  });

  var candleSeries = priceChart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderUpColor: '#26a69a',
    borderDownColor: '#ef5350',
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    priceFormat: {
      type: 'custom',
      formatter: function (p) { return '$' + Math.round(p).toLocaleString(); },
      minMove: 1,
    },
  });
  candleSeries.setData(data.candles);

  // 횡보 거래일 히스토그램 (일별 PnL 바)
  var swPnl = data.sideways_daily_pnl || {};
  var histData = [];
  var swDates = Object.keys(swPnl).sort();
  for (var k = 0; k < swDates.length; k++) {
    var d = swDates[k];
    var v = swPnl[d];
    histData.push({
      time: d,
      value: v,
      color: v >= 0 ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
    });
  }
  if (histData.length > 0) {
    var histSeries = priceChart.addHistogramSeries({
      priceFormat: {
        type: 'custom',
        formatter: function (p) { return p.toFixed(2) + '%'; },
      },
      priceScaleId: 'sideways',
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    priceChart.priceScale('sideways').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    histSeries.setData(histData);
  }

  // ── 매매 마커 ──

  var markers = [];
  for (var i = 0; i < data.daily_trades.length; i++) {
    var t = data.daily_trades[i];
    // 진입 마커
    if (t.entry_time) {
      markers.push({
        time: t.entry_time,
        position: t.side === 'long' ? 'belowBar' : 'aboveBar',
        color: t.side === 'long' ? '#26a69a' : '#ef5350',
        shape: t.side === 'long' ? 'arrowUp' : 'arrowDown',
        text: t.side === 'long' ? 'L' : 'S',
      });
    }
    // 청산 마커
    if (t.exit_time && t.exit_type !== 'holding') {
      var isProfit = t.roi_pct > 0;
      markers.push({
        time: t.exit_time,
        position: t.side === 'long' ? 'aboveBar' : 'belowBar',
        color: isProfit ? '#2196f3' : '#ff9800',
        shape: 'circle',
        text: (t.roi_pct >= 0 ? '+' : '') + t.roi_pct.toFixed(1) + '%',
      });
    }
  }
  markers.sort(function (a, b) {
    return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
  });
  candleSeries.setMarkers(markers);

  // ────────── Equity 차트 ──────────

  var eqEl = document.getElementById('equity-chart');
  var equityChart = LightweightCharts.createChart(eqEl, {
    autoSize: true,
    layout: {
      background: { color: '#ffffff' },
      textColor: '#333333',
      fontFamily: "'Maru Buri', sans-serif",
    },
    grid: {
      vertLines: { color: '#f0f0f0' },
      horzLines: { color: '#f0f0f0' },
    },
    rightPriceScale: {
      borderColor: '#e0e0e0',
      mode: LightweightCharts.PriceScaleMode.Logarithmic,
      scaleMargins: { top: 0.05, bottom: 0.05 },
    },
    timeScale: {
      borderColor: '#e0e0e0',
      timeVisible: false,
      rightOffset: 12,
    },
  });

  // Equity
  var combinedLine = equityChart.addLineSeries({
    color: '#5c6bc0',
    lineWidth: 2,
    priceFormat: { type: 'custom', formatter: formatKRW, minMove: 1 },
    crosshairMarkerRadius: 4,
  });
  combinedLine.setData(data.equity.combined);

  // ────────── 시간축 동기화 ──────────

  var syncing = false;
  priceChart.timeScale().subscribeVisibleLogicalRangeChange(function (range) {
    if (syncing || !range) return;
    syncing = true;
    equityChart.timeScale().setVisibleLogicalRange(range);
    syncing = false;
  });
  equityChart.timeScale().subscribeVisibleLogicalRangeChange(function (range) {
    if (syncing || !range) return;
    syncing = true;
    priceChart.timeScale().setVisibleLogicalRange(range);
    syncing = false;
  });

  // ────────── 전체 범위 표시 ──────────

  // 최근 3개월 기본 뷰
  var lastCandle = data.candles[data.candles.length - 1].time;
  var d3m = new Date(lastCandle);
  d3m.setMonth(d3m.getMonth() - 3);
  var fromDate = d3m.toISOString().slice(0, 10);
  priceChart.timeScale().setVisibleRange({ from: fromDate, to: lastCandle });

  // ────────── 생성 시각 표시 ──────────

  var genEl = document.getElementById('generated-at');
  if (genEl && data.generated_at) {
    genEl.textContent = '데이터 생성: ' + data.generated_at;
  }
})();
