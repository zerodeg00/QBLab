// Firebase 조회수 카운터
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getDatabase, ref, get, runTransaction } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD56oJVDcZ68M-T8sy53yM3VX7KkbCftf0",
  authDomain: "qblab-5e644.firebaseapp.com",
  databaseURL: "https://qblab-5e644-default-rtdb.firebaseio.com",
  projectId: "qblab-5e644",
  storageBucket: "qblab-5e644.firebasestorage.app",
  messagingSenderId: "789440586737",
  appId: "1:789440586737:web:cd0656fe86cb89b43d1a50"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const today = getTodayKST();
const VIEW_COOLDOWN_MS = 10 * 1000;
const totalRef = ref(db, 'pageviews/total');
const dailyRef = ref(db, 'pageviews/daily/' + today);
const pageKey = location.pathname.replace(/\//g, '_') || '_home';
const pageRef = ref(db, 'pageviews/pages/' + pageKey);
const cooldownKey = 'qb_last_view_' + location.pathname;

// 오늘 날짜 (KST)
function getTodayKST() {
  var now = new Date();
  var kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function renderCount(el, value) {
  if (el) {
    el.textContent = Math.max(0, Number(value) || 0).toLocaleString();
  }
}

function readCounters(todayEl, totalEl) {
  return Promise.allSettled([get(totalRef), get(dailyRef)]).then(function (results) {
    var totalResult = results[0];
    var dailyResult = results[1];

    if (totalResult.status === 'fulfilled') {
      renderCount(totalEl, totalResult.value.val());
    }

    if (dailyResult.status === 'fulfilled') {
      renderCount(todayEl, dailyResult.value.val());
    }
  });
}

function getLastViewTimestamp() {
  try {
    return Number(localStorage.getItem(cooldownKey)) || 0;
  } catch (_error) {
    return 0;
  }
}

function setLastViewTimestamp(timestamp) {
  try {
    localStorage.setItem(cooldownKey, String(timestamp));
  } catch (_error) {
    // 브라우저 저장소를 쓸 수 없는 경우에는 쿨다운 없이 집계한다.
  }
}

function clearLastViewTimestamp(timestamp) {
  try {
    if (Number(localStorage.getItem(cooldownKey)) === timestamp) {
      localStorage.removeItem(cooldownKey);
    }
  } catch (_error) {
    // 저장소 접근 실패는 무시한다.
  }
}

// 사이드바 위젯에 조회수 표시
var todayEl = document.getElementById('counter-today');
var totalEl = document.getElementById('counter-total');

if (todayEl || totalEl) {
  readCounters(todayEl, totalEl);
}

var now = Date.now();
var lastViewTimestamp = getLastViewTimestamp();

// 티스토리식 PV에 가깝게 집계하되, 같은 페이지의 아주 짧은 연속 새로고침만 10초 쿨다운으로 막는다.
if (now - lastViewTimestamp >= VIEW_COOLDOWN_MS) {
  setLastViewTimestamp(now);

  Promise.all([
    runTransaction(totalRef, function (val) {
      return (val || 0) + 1;
    }),
    runTransaction(dailyRef, function (val) {
      return (val || 0) + 1;
    }),
    runTransaction(pageRef, function (val) {
      return (val || 0) + 1;
    })
  ]).then(function (results) {
    var totalResult = results[0];
    var dailyResult = results[1];

    if (totalResult.committed) {
      renderCount(totalEl, totalResult.snapshot.val());
    }

    if (dailyResult.committed) {
      renderCount(todayEl, dailyResult.snapshot.val());
    }
  }).catch(function () {
    clearLastViewTimestamp(now);
    return readCounters(todayEl, totalEl);
  });
}
