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
const totalRef = ref(db, 'pageviews/total');
const dailyRef = ref(db, 'pageviews/daily/' + today);
const pageKey = location.pathname.replace(/\//g, '_') || '_home';
const pageRef = ref(db, 'pageviews/pages/' + pageKey);

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

// 중복 카운트 방지 (세션당 1회)
var counted = sessionStorage.getItem('qb_counted_' + location.pathname);

// 사이드바 위젯에 조회수 표시
var todayEl = document.getElementById('counter-today');
var totalEl = document.getElementById('counter-total');

if (todayEl || totalEl) {
  readCounters(todayEl, totalEl);
}

if (!counted) {
  sessionStorage.setItem('qb_counted_' + location.pathname, '1');

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
    sessionStorage.removeItem('qb_counted_' + location.pathname);
    return readCounters(todayEl, totalEl);
  });
}
