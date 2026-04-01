#!/usr/bin/env python3
"""큐비랩 월간 투자 레포트 대시보드 이미지 생성 (SVG + PNG)

Usage:
    python generate_monthly_dashboard.py --year 26 --month 3 \
        --monthly-roi "+15.1%" --cumulative-roi "+18.3%" \
        --output static/images/posts/2603-monthly-dashboard.svg
"""

import argparse
import os
import re
import sys


def _normalize_roi(raw: str) -> tuple[str, bool]:
    """수익률 입력을 정규화한다. (부호 + 숫자 + %)"""
    s = raw.strip().lstrip("\\")

    m = re.match(r'([+-])?\s*([0-9.]+)\s*(%)?$', s)
    if m:
        sign = m.group(1) or '+'
        num = m.group(2)
        return f"{sign}{num}%", sign == '+'

    print(f"오류: 수익률 형식을 인식할 수 없습니다: '{raw}'", file=sys.stderr)
    print("  허용 형식: '+15.1%', '-2.5%', '15.1'", file=sys.stderr)
    sys.exit(1)


def generate_monthly_dashboard(year, month, monthly_roi, cumulative_roi, output_path):
    W, H = 1800, 945

    # === 파생 값 ===
    monthly_roi_str, monthly_positive = _normalize_roi(monthly_roi)
    cumulative_roi_str, cumulative_positive = _normalize_roi(cumulative_roi)

    date_label = f"{year}년 {month}월"
    title_label = "월간 투자 레포트"
    monthly_label = f"월간 수익률 — {monthly_roi_str}"
    cumulative_label = f"{year}년 누적 — {cumulative_roi_str}"

    # === 색상 (데일리 대시보드와 동일) ===
    GREEN = "#10B981"
    RED = "#EF4444"
    TEXT_BLACK = "#1E1F21"
    TEXT_GRAY = "#6B7280"
    BORDER = "#E6E6E9"
    ACCENT = "#2d6a4f"

    monthly_color = GREEN if monthly_positive else RED
    cumulative_color = GREEN if cumulative_positive else RED

    mid_x = W // 2

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <style>
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
      text {{ font-family: 'Pretendard', sans-serif; }}
    </style>
  </defs>

  <!-- 배경 -->
  <rect width="{W}" height="{H}" fill="#FFFFFF"/>

  <!-- 상단 악센트 라인 -->
  <rect x="0" y="0" width="{W}" height="6" fill="{ACCENT}"/>

  <!-- 날짜 (상단) -->
  <text x="{mid_x}" y="200" text-anchor="middle"
        font-size="72" font-weight="600" fill="{TEXT_GRAY}">
    {date_label}
  </text>

  <!-- 제목 (중앙) -->
  <text x="{mid_x}" y="400" text-anchor="middle"
        font-size="120" font-weight="800" fill="{TEXT_BLACK}">
    {title_label}
  </text>

  <!-- 구분선 -->
  <line x1="80" y1="520" x2="{W - 80}" y2="520"
        stroke="{BORDER}" stroke-width="2"/>

  <!-- 세로 구분선 -->
  <line x1="{mid_x}" y1="570" x2="{mid_x}" y2="{H - 80}"
        stroke="{BORDER}" stroke-width="2"/>

  <!-- 월간 수익률 (좌) -->
  <text x="{mid_x // 2}" y="680" text-anchor="middle"
        font-size="42" font-weight="500" fill="{TEXT_GRAY}">
    월간 수익률
  </text>
  <text x="{mid_x // 2}" y="800" text-anchor="middle"
        font-size="88" font-weight="700" fill="{monthly_color}">
    {monthly_roi_str}
  </text>

  <!-- 누적 수익률 (우) -->
  <text x="{mid_x + mid_x // 2}" y="680" text-anchor="middle"
        font-size="42" font-weight="500" fill="{TEXT_GRAY}">
    {year}년 누적 수익률
  </text>
  <text x="{mid_x + mid_x // 2}" y="800" text-anchor="middle"
        font-size="88" font-weight="700" fill="{cumulative_color}">
    {cumulative_roi_str}
  </text>
</svg>'''

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # SVG 저장
    svg_path = output_path
    if svg_path.endswith('.png'):
        svg_path = svg_path.replace('.png', '.svg')

    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(svg)
    print(f"저장 완료: {svg_path}")

    # PNG 폴백 (OG 이미지용)
    png_path = svg_path.replace('.svg', '.png')
    try:
        import cairosvg
        cairosvg.svg2png(bytestring=svg.encode('utf-8'),
                         write_to=png_path, output_width=W, output_height=H)
        print(f"저장 완료: {png_path}")
    except ImportError:
        from PIL import Image, ImageDraw, ImageFont
        FONT_DIR = os.path.expanduser("~/Library/Fonts")
        img = Image.new("RGB", (W * 2, H * 2), "#FFFFFF")
        draw = ImageDraw.Draw(img)

        fp_date = ImageFont.truetype(os.path.join(FONT_DIR, "Pretendard-SemiBold.otf"), 144)
        fp_title = ImageFont.truetype(os.path.join(FONT_DIR, "Pretendard-ExtraBold.otf"), 240)
        fp_label = ImageFont.truetype(os.path.join(FONT_DIR, "Pretendard-Medium.otf"), 84)
        fp_roi = ImageFont.truetype(os.path.join(FONT_DIR, "Pretendard-Bold.otf"), 176)

        def cx(text, font):
            bb = draw.textbbox((0, 0), text, font=font)
            return (W * 2 - (bb[2] - bb[0])) // 2

        def cx_half(text, font, half):
            """half=0: left half, half=1: right half"""
            bb = draw.textbbox((0, 0), text, font=font)
            tw = bb[2] - bb[0]
            if half == 0:
                return (W - tw) // 2
            else:
                return W + (W - tw) // 2

        # 상단 악센트 라인
        draw.rectangle([(0, 0), (W * 2, 12)], fill=ACCENT)

        # 날짜
        draw.text((cx(date_label, fp_date), 260), date_label,
                  fill=TEXT_GRAY, font=fp_date)

        # 제목
        draw.text((cx(title_label, fp_title), 560), title_label,
                  fill=TEXT_BLACK, font=fp_title)

        # 구분선
        ly = 1040
        draw.line([(160, ly), (W * 2 - 160, ly)], fill=BORDER, width=4)
        draw.line([(W, ly + 80), (W, H * 2 - 160)], fill=BORDER, width=4)

        # 월간 수익률 (좌)
        draw.text((cx_half("월간 수익률", fp_label, 0), 1180), "월간 수익률",
                  fill=TEXT_GRAY, font=fp_label)
        draw.text((cx_half(monthly_roi_str, fp_roi, 0), 1360), monthly_roi_str,
                  fill=monthly_color, font=fp_roi)

        # 누적 수익률 (우)
        cum_label = f"{year}년 누적 수익률"
        draw.text((cx_half(cum_label, fp_label, 1), 1180), cum_label,
                  fill=TEXT_GRAY, font=fp_label)
        draw.text((cx_half(cumulative_roi_str, fp_roi, 1), 1360), cumulative_roi_str,
                  fill=cumulative_color, font=fp_roi)

        img = img.resize((W, H), Image.LANCZOS)
        img.save(png_path, "PNG", optimize=True)
        print(f"저장 완료: {png_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="큐비랩 월간 투자 레포트 대시보드 이미지 생성")
    parser.add_argument("--year", required=True, help="연도 (2자리, 예: '26')")
    parser.add_argument("--month", required=True, help="월 (예: '3')")
    parser.add_argument("--monthly-roi", required=True, help="월간 수익률 (예: '+15.1%%')")
    parser.add_argument("--cumulative-roi", required=True, help="연간 누적 수익률 (예: '+18.3%%')")
    parser.add_argument("--output", required=True, help="출력 파일 경로 (.svg 또는 .png)")

    args = parser.parse_args()
    generate_monthly_dashboard(args.year, args.month,
                               args.monthly_roi, args.cumulative_roi, args.output)
