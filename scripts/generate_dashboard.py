#!/usr/bin/env python3
"""큐비랩 데일리 브리핑 대시보드 이미지 생성 (SVG + PNG)

Usage:
    python generate_dashboard.py --price "$70,800" \
        --change "+4.4%" --position LONG --fear-greed 28 \
        --output static/images/posts/260324-dashboard.svg
"""

import argparse
import os
import re
import sys


def _normalize_change(raw: str) -> tuple[str, bool]:
    """변동률 입력을 정규화한다."""
    s = raw.strip().lstrip("\\")

    m = re.match(r'(?i)(up|down)\s*([0-9.]+)\s*(%)?$', s)
    if m:
        sign = '+' if m.group(1).lower() == 'up' else '-'
        num = m.group(2)
        return f"{sign}{num}%", sign == '+'

    m = re.match(r'([+-])\s*([0-9.]+)\s*(%)?$', s)
    if m:
        sign = m.group(1)
        num = m.group(2)
        return f"{sign}{num}%", sign == '+'

    m = re.match(r'([0-9.]+)\s*(%)?$', s)
    if m:
        num = m.group(1)
        return f"+{num}%", True

    print(f"오류: 변동률 형식을 인식할 수 없습니다: '{raw}'", file=sys.stderr)
    print("  허용 형식: '+4.4%', '-2.5%', 'up4.4', 'down2.5'", file=sys.stderr)
    sys.exit(1)


def generate_dashboard(btc_price, btc_change, position, fear_greed, output_path):
    W, H = 1800, 945

    # === 파생 값 ===
    btc_change, btc_change_positive = _normalize_change(btc_change)
    pos_upper = position.upper()
    is_long = pos_upper in ("LONG", "롱", "롱 매수")
    is_short = pos_upper in ("SHORT", "숏", "숏 매수", "숏 보유", "숏 보유 중")

    if is_long:
        pos_label = "포지션 — 롱"
        pos_positive = True
    elif is_short:
        pos_label = "포지션 — 숏"
        pos_positive = False
    else:
        pos_label = "포지션 — 없음"
        pos_positive = None

    fear_label = f"공포지수 — {fear_greed}"

    # === 색상 ===
    GREEN = "#10B981"
    RED = "#EF4444"
    TEXT_BLACK = "#1E1F21"
    BORDER = "#E6E6E9"
    NEUTRAL_COLOR = "#6B7280"

    change_color = GREEN if btc_change_positive else RED
    arrow = "▲" if btc_change_positive else "▼"

    if pos_positive is True:
        pos_color = GREEN
    elif pos_positive is False:
        pos_color = RED
    else:
        pos_color = NEUTRAL_COLOR

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

  <!-- 가격 -->
  <text x="{mid_x}" y="340" text-anchor="middle"
        font-size="160" font-weight="700" fill="{TEXT_BLACK}">
    {btc_price}
  </text>

  <!-- 변동률 -->
  <text x="{mid_x}" y="500" text-anchor="middle"
        font-size="80" font-weight="700" fill="{change_color}">
    {arrow}  {btc_change}
  </text>

  <!-- 구분선 -->
  <line x1="80" y1="590" x2="{W - 80}" y2="590"
        stroke="{BORDER}" stroke-width="2"/>

  <!-- 포지션 (중앙) -->
  <text x="{mid_x}" y="720" text-anchor="middle"
        font-size="72" font-weight="700" fill="{pos_color}">
    {pos_label}
  </text>

  <!-- 공포지수 (중앙) -->
  <text x="{mid_x}" y="850" text-anchor="middle"
        font-size="72" font-weight="700" fill="{TEXT_BLACK}">
    {fear_label}
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
        # cairosvg 없으면 Pillow 폴백
        from PIL import Image, ImageDraw, ImageFont
        FONT_DIR = os.path.expanduser("~/Library/Fonts")
        img = Image.new("RGB", (W * 2, H * 2), "#FFFFFF")
        draw = ImageDraw.Draw(img)
        fp_bold = ImageFont.truetype(os.path.join(FONT_DIR, "Pretendard-Bold.otf"), 320)
        fp_change = ImageFont.truetype(os.path.join(FONT_DIR, "Pretendard-SemiBold.otf"), 160)
        fp_bottom = ImageFont.truetype(os.path.join(FONT_DIR, "Pretendard-Bold.otf"), 144)

        def cx(text, font):
            bb = draw.textbbox((0, 0), text, font=font)
            return (W * 2 - (bb[2] - bb[0])) // 2

        draw.text((cx(btc_price, fp_bold), 380), btc_price,
                  fill=TEXT_BLACK, font=fp_bold)

        ct = f"{arrow}  {btc_change}"
        draw.text((cx(ct, fp_change), 800), ct,
                  fill=change_color, font=fp_change)

        ly = 1140
        draw.line([(160, ly), (W * 2 - 160, ly)], fill=BORDER, width=4)

        # 포지션 (중앙)
        draw.text((cx(pos_label, fp_bottom), 1240), pos_label,
                  fill=pos_color, font=fp_bottom)
        # 공포지수 (중앙)
        draw.text((cx(fear_label, fp_bottom), 1500), fear_label,
                  fill=TEXT_BLACK, font=fp_bottom)

        img = img.resize((W, H), Image.LANCZOS)
        img.save(png_path, "PNG", optimize=True)
        print(f"저장 완료: {png_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="큐비랩 대시보드 이미지 생성")
    parser.add_argument("--price", required=True, help="BTC 가격 (예: '$70,800')")
    parser.add_argument("--change", required=True, help="변동률 (예: '+4.4%%')")
    parser.add_argument("--position", required=True, help="포지션 (LONG/SHORT/NEUTRAL)")
    parser.add_argument("--fear-greed", type=int, required=True, help="공포탐욕지수 (0-100)")
    parser.add_argument("--output", required=True, help="출력 파일 경로 (.svg 또는 .png)")

    args = parser.parse_args()
    generate_dashboard(args.price, args.change,
                       args.position, args.fear_greed, args.output)
