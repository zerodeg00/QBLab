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

    # === 색상 (데일리 대시보드와 동일) ===
    GREEN = "#10B981"
    RED = "#EF4444"
    TEXT_BLACK = "#1E1F21"
    TEXT_GRAY = "#6B7280"
    BORDER = "#E6E6E9"

    monthly_color = GREEN if monthly_positive else RED
    cumulative_color = GREEN if cumulative_positive else RED

    mid_x = W // 2

    # 하단 레이블+수치 가로 배치 좌표
    label_x = mid_x - 30   # 레이블 오른쪽 정렬
    value_x = mid_x + 30   # 수치 왼쪽 정렬
    row1_y = 700
    row2_y = 840

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <style>
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
      text {{ font-family: 'Pretendard', sans-serif; }}
    </style>
  </defs>

  <!-- 배경 -->
  <rect width="{W}" height="{H}" fill="#FFFFFF"/>

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

  <!-- 월간 수익률 (레이블 + 수치 가로 배치) -->
  <text x="{label_x}" y="{row1_y}" text-anchor="end"
        font-size="72" font-weight="600" fill="{TEXT_GRAY}">
    월간
  </text>
  <text x="{value_x}" y="{row1_y}" text-anchor="start"
        font-size="72" font-weight="700" fill="{monthly_color}">
    {monthly_roi_str}
  </text>

  <!-- 누적 수익률 (레이블 + 수치 가로 배치) -->
  <text x="{label_x}" y="{row2_y}" text-anchor="end"
        font-size="72" font-weight="600" fill="{TEXT_GRAY}">
    누적
  </text>
  <text x="{value_x}" y="{row2_y}" text-anchor="start"
        font-size="72" font-weight="700" fill="{cumulative_color}">
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
        fp_row = ImageFont.truetype(os.path.join(FONT_DIR, "Pretendard-SemiBold.otf"), 144)
        fp_row_val = ImageFont.truetype(os.path.join(FONT_DIR, "Pretendard-Bold.otf"), 144)

        def cx(text, font):
            bb = draw.textbbox((0, 0), text, font=font)
            return (W * 2 - (bb[2] - bb[0])) // 2

        def tw(text, font):
            bb = draw.textbbox((0, 0), text, font=font)
            return bb[2] - bb[0]

        # 날짜
        draw.text((cx(date_label, fp_date), 260), date_label,
                  fill=TEXT_GRAY, font=fp_date)

        # 제목
        draw.text((cx(title_label, fp_title), 560), title_label,
                  fill=TEXT_BLACK, font=fp_title)

        # 구분선
        ly = 1040
        draw.line([(160, ly), (W * 2 - 160, ly)], fill=BORDER, width=4)

        # 레이블+수치 가로 배치 (중앙 정렬)
        gap = 60  # 레이블-수치 간격
        label_x_anchor = W - gap  # 레이블 오른쪽 끝
        value_x_anchor = W + gap  # 수치 왼쪽 시작

        # 월간 수익률
        r1_y = 1200
        lbl1 = "월간"
        draw.text((label_x_anchor - tw(lbl1, fp_row), r1_y), lbl1,
                  fill=TEXT_GRAY, font=fp_row)
        draw.text((value_x_anchor, r1_y), monthly_roi_str,
                  fill=monthly_color, font=fp_row_val)

        # 누적 수익률
        r2_y = 1480
        lbl2 = "누적"
        draw.text((label_x_anchor - tw(lbl2, fp_row), r2_y), lbl2,
                  fill=TEXT_GRAY, font=fp_row)
        draw.text((value_x_anchor, r2_y), cumulative_roi_str,
                  fill=cumulative_color, font=fp_row_val)

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
