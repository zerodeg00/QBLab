// Firebase 조회수 카운터
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getDatabase, ref, get, set, runTransaction } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

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

// 오늘 날짜 (KST)
function getTodayKST() {
  var now = new Date();
  var kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// 중복 카운트 방지 (세션당 1회)
var counted = sessionStorage.getItem('qb_counted_' + location.pathname);

if (!counted) {
  sessionStorage.setItem('qb_counted_' + location.pathname, '1');
  var today = getTodayKST();

  // 전체 조회수 +1
  runTransaction(ref(db, 'pageviews/total'), function (val) {
    return (val || 0) + 1;
  });

  // 당일 조회수 +1
  runTransaction(ref(db, 'pageviews/daily/' + today), function (val) {
    return (val || 0) + 1;
  });

  // 페이지별 조회수 +1
  var pageKey = location.pathname.replace(/\//g, '_') || '_home';
  runTransaction(ref(db, 'pageviews/pages/' + pageKey), function (val) {
    return (val || 0) + 1;
  });
}

// 사이드바 위젯에 조회수 표시
var todayEl = document.getElementById('counter-today');
var totalEl = document.getElementById('counter-total');

if (todayEl || totalEl) {
  var today = getTodayKST();

  get(ref(db, 'pageviews/total')).then(function (snap) {
    if (totalEl) totalEl.textContent = (snap.val() || 0).toLocaleString();
  });

  get(ref(db, 'pageviews/daily/' + today)).then(function (snap) {
    if (todayEl) todayEl.textContent = (snap.val() || 0).toLocaleString();
  });
}
