/**
 * 홈페이지 미니 백테스트 차트
 * - BTC/USDT 일봉 + 매매 마커
 * - 컴팩트 버전 (Equity 곡선 없음)
 */
(async function () {
  'use strict';

  var DATA_URL = '/data/backtest-binance.json';
  var container = document.getElementById('home-chart');
  var statsEl = document.getElementById('home-chart-stats');
  if (!container) return;

  // ── 데이터 로드 ──
  var data;
  try {
    var resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    data = await resp.json();
  } catch (err) {
    var section = document.querySelector('.home-chart-section');
    if (section) section.style.display = 'none';
    return;
  }

  // ── Stats ──
  if (statsEl) {
    var s = data.stats.combined;
    var monthlyAvg = (Math.pow(s.roi_pct / 100 + 1, 1 / s.total_months) - 1) * 100;
    statsEl.innerHTML =
      '<span class="hc-stat">월평균 <b class="hc-pos">+' + monthlyAvg.toFixed(1) + '%</b></span>' +
      '<span class="hc-divider"></span>' +
      '<span class="hc-stat"><b>' + s.trades.toLocaleString() + '</b>건</span>' +
      '<span class="hc-divider"></span>' +
      '<span class="hc-stat">승률 <b>' + s.win_rate.toFixed(1) + '%</b></span>' +
      '<span class="hc-divider"></span>' +
      '<span class="hc-stat">MDD <b class="hc-neg">' + s.mdd_pct.toFixed(1) + '%</b></span>';
  }

  // ── 차트 ──
  var chart = LightweightCharts.createChart(container, {
    autoSize: true,
    layout: {
      background: { color: '#fafbfc' },
      textColor: '#666',
      fontFamily: "'Maru Buri', sans-serif",
      fontSize: 11,
    },
    grid: {
      vertLines: { color: '#f0f0f2' },
      horzLines: { color: '#f0f0f2' },
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: {
      borderColor: '#e8e8ec',
      scaleMargins: { top: 0.08, bottom: 0.04 },
    },
    timeScale: {
      borderColor: '#e8e8ec',
      timeVisible: false,
      rightOffset: 12,
      fixLeftEdge: true,
    },
    handleScroll: true,
    handleScale: true,
  });

  var candleSeries = chart.addCandlestickSeries({
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

  // ── 매매 마커 ──
  var markers = [];
  for (var i = 0; i < data.daily_trades.length; i++) {
    var t = data.daily_trades[i];
    if (t.entry_time) {
      markers.push({
        time: t.entry_time,
        position: t.side === 'long' ? 'belowBar' : 'aboveBar',
        color: t.side === 'long' ? '#26a69a' : '#ef5350',
        shape: t.side === 'long' ? 'arrowUp' : 'arrowDown',
        text: t.side === 'long' ? 'L' : 'S',
      });
    }
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

  // 최근 3개월 기본 뷰
  var lastCandle = data.candles[data.candles.length - 1].time;
  var d3m = new Date(lastCandle);
  d3m.setMonth(d3m.getMonth() - 3);
  var fromDate = d3m.toISOString().slice(0, 10);
  chart.timeScale().setVisibleRange({ from: fromDate, to: lastCandle });
})();
