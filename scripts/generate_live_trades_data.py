#!/usr/bin/env python3
"""Generate public live Binance trade data for the QBLab home chart."""

from __future__ import annotations

import csv
import json
import math
import re
import sys
import urllib.request
from datetime import datetime, time, timedelta
from pathlib import Path


SHEET_CSV_URL = (
    "https://docs.google.com/spreadsheets/d/"
    "1Dv0-TZx1KYPfzE7usZJK8KlT7_Zewcyi8O_Qua54tFo/export?format=csv&gid=1904496378"
)
OUT_PATH = Path(__file__).resolve().parents[1] / "static/data/live-binance-trades.json"
BLOG_PATH = Path(__file__).resolve().parents[1] / "content/trades/binance.md"
AUTOTRADING_DIR = Path(__file__).resolve().parents[2] / "AutoTrading"
CANONICAL_15M_PATH = (
    AUTOTRADING_DIR
    / "backtest_datasets/binance_btcusdt_canonical/ohlcv_15m.csv"
)


def round_float(value: str | float, digits: int = 2) -> float:
    return round(float(value), digits)


def parse_price(value: str) -> int:
    return round(float(value.replace(",", "").replace("$", "").strip()))


def parse_pct(value: str) -> float:
    return float(value.replace("%", "").replace("+", "").strip())


def parse_direction(value: str) -> str:
    match = re.search(r"\[(Long|Short)\]", value)
    if not match:
        raise ValueError(f"direction not found: {value!r}")
    return match.group(1)


def parse_date(value: str) -> str:
    return datetime.strptime(value.strip(), "%Y-%m-%d %H:%M").strftime("%Y-%m-%d")


def fetch_rows() -> list[dict[str, str]]:
    with urllib.request.urlopen(SHEET_CSV_URL, timeout=20) as response:
        text = response.read().decode("utf-8-sig")

    lines = text.splitlines()
    header_index = next(
        i for i, line in enumerate(lines) if line.startswith("진입일,청산일,구분,")
    )
    return list(csv.DictReader(lines[header_index:]))


def max_drawdown_pct(equity_values: list[float]) -> float:
    peak = equity_values[0]
    max_dd = 0.0
    for value in equity_values:
        peak = max(peak, value)
        if peak > 0:
            max_dd = max(max_dd, (peak - value) / peak * 100)
    return round(max_dd, 2)


def trade_result(roi: float) -> str:
    if roi > 0:
        return "수익"
    if roi < 0:
        return "손실"
    return "보합"


def candle_day(ts: datetime) -> str:
    if ts.time() < time(hour=9):
        ts = ts - timedelta(days=1)
    return ts.strftime("%Y-%m-%d")


def build_candles(last_date: str) -> list[dict]:
    if not CANONICAL_15M_PATH.exists():
        raise FileNotFoundError(f"canonical candle file not found: {CANONICAL_15M_PATH}")

    daily: dict[str, dict] = {}
    with CANONICAL_15M_PATH.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ts = datetime.strptime(row[""], "%Y-%m-%d %H:%M:%S")
            day = candle_day(ts)
            if day > last_date:
                continue
            current = daily.get(day)
            o = round_float(row["open"])
            h = round_float(row["high"])
            l = round_float(row["low"])
            c = round_float(row["close"])
            if current is None:
                daily[day] = {"time": day, "open": o, "high": h, "low": l, "close": c}
            else:
                current["high"] = max(current["high"], h)
                current["low"] = min(current["low"], l)
                current["close"] = c

    return [daily[day] for day in sorted(daily)]


def compound_roi(values: list[float]) -> float:
    total = 1.0
    for value in values:
        total *= 1 + value / 100
    return round((total - 1) * 100, 2)


def signed_pct(value: float) -> str:
    if value == 0:
        return "0.00%"
    return f"{value:+.2f}%"


def mmdd(value: str) -> str:
    return datetime.strptime(value, "%Y-%m-%d").strftime("%m-%d")


def price(value: int) -> str:
    return f"${value:,}"


def month_count(first_date: str, last_date: str) -> int:
    first = datetime.strptime(first_date, "%Y-%m-%d")
    last = datetime.strptime(last_date, "%Y-%m-%d")
    return max(1, (last.year - first.year) * 12 + last.month - first.month + 1)


def build_payload(rows: list[dict[str, str]]) -> dict:
    trades = []
    cumulative_multiplier = 1.0
    for row in rows:
        if not row.get("진입일") or "청산" not in row.get("구분", ""):
            continue

        roi = round(parse_pct(row["수익률"]), 2)
        cumulative_multiplier *= 1 + roi / 100
        cumulative_roi = round((cumulative_multiplier - 1) * 100, 2)
        trades.append(
            {
                "number": len(trades) + 1,
                "direction": parse_direction(row["구분"]),
                "entry_date": parse_date(row["진입일"]),
                "exit_date": parse_date(row["청산일"]),
                "entry_price": parse_price(row["BTC 진입가($)"]),
                "exit_price": parse_price(row["BTC 청산가($)"]),
                "roi": roi,
                "cumulative_roi": cumulative_roi,
                "result": trade_result(roi),
            }
        )

    if not trades:
        raise RuntimeError("no closed trades found")

    equity_by_date = {trades[0]["entry_date"]: 0.0}
    roi_by_exit_date: dict[str, list[float]] = {}
    for trade in trades:
        equity_by_date[trade["exit_date"]] = trade["cumulative_roi"]
        roi_by_exit_date.setdefault(trade["exit_date"], []).append(trade["roi"])
    equity = [
        {"time": date, "value": value}
        for date, value in sorted(equity_by_date.items())
    ]
    daily_markers = [
        {
            "time": day,
            "roi": compound_roi(values),
            "trades": len(values),
            "cumulative_roi": equity_by_date[day],
        }
        for day, values in sorted(roi_by_exit_date.items())
    ]

    wins = sum(1 for trade in trades if trade["roi"] > 0)
    losses = sum(1 for trade in trades if trade["roi"] < 0)
    flats = len(trades) - wins - losses
    total_roi = trades[-1]["cumulative_roi"]
    months = month_count(trades[0]["entry_date"], trades[-1]["exit_date"])
    monthly_avg = (math.pow(total_roi / 100 + 1, 1 / months) - 1) * 100
    equity_index = [1.0] + [1 + trade["cumulative_roi"] / 100 for trade in trades]

    return {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "source": "google_sheets_binance_trades",
        "candles": build_candles(trades[-1]["exit_date"]),
        "trades": trades,
        "daily_markers": daily_markers,
        "equity": equity,
        "stats": {
            "total_trades": len(trades),
            "wins": wins,
            "losses": losses,
            "flats": flats,
            "win_rate": round(wins / len(trades) * 100, 1),
            "total_roi": total_roi,
            "monthly_avg": round(monthly_avg, 1),
            "mdd": max_drawdown_pct(equity_index),
            "months": months,
            "first_trade_date": trades[0]["entry_date"],
            "last_trade_date": trades[-1]["exit_date"],
        },
    }


def render_blog_markdown(payload: dict) -> str:
    rows = []
    for trade in payload["trades"]:
        rows.append(
            "| {number} | {direction} | {entry_date} | {exit_date} | "
            "{entry_price} | {exit_price} | {roi} | {cumulative_roi} | {result} |".format(
                number=trade["number"],
                direction=trade["direction"],
                entry_date=mmdd(trade["entry_date"]),
                exit_date=mmdd(trade["exit_date"]),
                entry_price=price(trade["entry_price"]),
                exit_price=price(trade["exit_price"]),
                roi=signed_pct(trade["roi"]),
                cumulative_roi=signed_pct(trade["cumulative_roi"]),
                result=trade["result"],
            )
        )

    stats = payload["stats"]
    flat_text = f" {stats['flats']}보합" if stats["flats"] else ""
    summary = (
        f"> {stats['total_trades']}건 청산: "
        f"{stats['wins']}승 {stats['losses']}패{flat_text} "
        f"(승률 {round(stats['wins'] / stats['total_trades'] * 100)}%) · "
        f"누적 수익률 {signed_pct(stats['total_roi'])}"
    )

    return (
        "---\n"
        'title: "바이낸스 실매매 내역"\n'
        "date: 2026-06-24\n"
        'tags: ["자동매매", "바이낸스", "실매매", "트레이딩"]\n'
        'description: "큐비랩 자동매매 시스템의 바이낸스 선물 실제 거래 기록. BTC 진입가/청산가와 수익률만 공개."\n'
        'author: "큐비랩"\n'
        "draft: false\n"
        "---\n\n"
        "큐비랩 자동매매 시스템의 바이낸스 선물 실제 거래 기록이다. 새로운 거래가 발생할 때마다 업데이트한다.\n\n"
        "> 자동매매 시스템은 현재도 지속적으로 개발·개선 중이다. 개발 과정에서 전략이 업데이트되기 때문에 실제 매매 결과가 최종 백테스트와 다를 수 있다. 최종적으로는 백테스트와 동일한 성과를 실현하는 것이 목표다.\n\n"
        "| # | 방향 | 진입일 | 청산일 | BTC 진입가 | BTC 청산가 | 수익률 | 누적 수익률 | 결과 |\n"
        "|---|------|--------|--------|-----------|-----------|--------|------------|------|\n"
        + "\n".join(rows)
        + "\n\n"
        + summary
        + "\n"
    )


def main() -> int:
    payload = build_payload(fetch_rows())
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    BLOG_PATH.write_text(render_blog_markdown(payload), encoding="utf-8")
    stats = payload["stats"]
    print(
        "generated "
        f"{OUT_PATH} "
        f"trades={stats['total_trades']} "
        f"win_rate={stats['win_rate']}% "
        f"monthly_avg={stats['monthly_avg']}% "
        f"mdd={stats['mdd']}% "
        f"total_roi={stats['total_roi']}%"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
