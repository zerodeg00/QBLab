/**
 * 홈페이지 실거래 차트
 * - BTC/USDT 일봉 + Google Sheets 기반 실거래 결과 마커
 * - 공개 가능 항목만 사용
 */
(async function () {
  'use strict';

  var DATA_URL = '/data/live-binance-trades.json';
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
    var s = data.stats;
    statsEl.innerHTML =
      '<span class="hc-stat">월평균 <b class="hc-pos">+' + s.monthly_avg.toFixed(1) + '%</b></span>' +
      '<span class="hc-divider"></span>' +
      '<span class="hc-stat"><b>' + s.total_trades.toLocaleString() + '</b>건</span>' +
      '<span class="hc-divider"></span>' +
      '<span class="hc-stat">승률 <b>' + s.win_rate.toFixed(1) + '%</b></span>' +
      '<span class="hc-divider"></span>' +
      '<span class="hc-stat">MDD <b class="hc-neg">' + s.mdd.toFixed(1) + '%</b></span>';
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

  // ── 일별 실거래 결과 마커 ──
  var markers = [];
  for (var i = 0; i < data.daily_markers.length; i++) {
    var t = data.daily_markers[i];
    var isProfit = t.roi > 0;
    var isFlat = t.roi === 0;
    var label = (t.roi >= 0 ? '+' : '') + t.roi.toFixed(1) + '%';
    if (t.trades > 1) label += ' x' + t.trades;
    markers.push({
      time: t.time,
      position: isProfit ? 'aboveBar' : 'belowBar',
      color: isFlat ? '#888888' : isProfit ? '#26a69a' : '#ef5350',
      shape: 'circle',
      text: label,
    });
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
