# -*- coding: utf-8 -*-
"""
生成品牌图标：朱砂方印 + 「華」字
输出：
  public/favicon.svg           矢量版（现代浏览器优先）
  public/favicon.ico           16/32/48 多尺寸（老浏览器 + 标签页）
  public/images/icon-192.png   安卓主屏图标
  public/images/icon-512.png   高清图标 / PWA
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public')
IMAGES = os.path.join(PUBLIC, 'images')
os.makedirs(IMAGES, exist_ok=True)

CINNABAR = '#a8321f'
CINNABAR_DEEP = '#7d2415'
PAPER = '#f7f1e3'

# ---------------------------------------------------------------- SVG 矢量图
# 方印造型：朱砂渐变底 + 内层细白框 + 楷体「華」
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="seal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{CINNABAR}"/>
      <stop offset="1" stop-color="{CINNABAR_DEEP}"/>
    </linearGradient>
  </defs>
  <!-- 印章底：近似圆角方印 -->
  <rect x="3" y="3" width="58" height="58" rx="9" ry="9" fill="url(#seal)"/>
  <!-- 内层描边，模拟印面边框 -->
  <rect x="8.5" y="8.5" width="47" height="47" rx="5" ry="5"
        fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.6"/>
  <!-- 印文 -->
  <text x="32" y="33" text-anchor="middle" dominant-baseline="central"
        font-family="KaiTi, STKaiti, SimSun, serif" font-size="34" font-weight="700"
        fill="{PAPER}">華</text>
</svg>
'''

svg_path = os.path.join(PUBLIC, 'favicon.svg')
with open(svg_path, 'w', encoding='utf-8') as f:
    f.write(svg)
print('已生成', svg_path)

# ---------------------------------------------------------------- PNG / ICO
try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print('未安装 Pillow，仅生成 SVG。请运行：pip install Pillow')
    raise SystemExit(0)

KAI_CANDIDATES = [
    r'C:\Windows\Fonts\simkai.ttf',
    r'C:\Windows\Fonts\STKAITI.TTF',
    r'C:\Windows\Fonts\simsun.ttc',
    r'C:\Windows\Fonts\simhei.ttf',
]


def load_font(size):
    for p in KAI_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def render_icon(size):
    # 4 倍超采样后缩放，边缘更干净
    ss = 4
    W = size * ss
    img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 朱砂渐变底（逐行插值模拟线性渐变）
    radius = int(W * 0.14)
    grad = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    c1 = (0xA8, 0x32, 0x1F)
    c2 = (0x7D, 0x24, 0x15)
    for y in range(W):
        t = y / max(1, W - 1)
        col = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)) + (255,)
        gd.line([(0, y), (W, y)], fill=col)

    # 圆角遮罩
    mask = Image.new('L', (W, W), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, W - 1], radius=radius, fill=255)
    img.paste(grad, (0, 0), mask)

    # 内层描边
    pad = int(W * 0.085)
    d.rounded_rectangle(
        [pad, pad, W - pad, W - pad],
        radius=int(W * 0.075),
        outline=(255, 255, 255, 140),
        width=max(1, int(W * 0.022)),
    )

    # 印文「華」
    font = load_font(int(W * 0.56))
    text = '華'
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(
        ((W - tw) / 2 - bbox[0], (W - th) / 2 - bbox[1]),
        text, font=font, fill=(0xF7, 0xF1, 0xE3, 255),
    )

    return img.resize((size, size), Image.LANCZOS)


# 多尺寸 PNG
for s in (192, 512):
    out = os.path.join(IMAGES, f'icon-{s}.png')
    render_icon(s).save(out, 'PNG', optimize=True)
    print('已生成', out)

# favicon.ico（16/32/48）
ico_sizes = [16, 32, 48]
base = render_icon(64)
ico_path = os.path.join(PUBLIC, 'favicon.ico')
base.save(ico_path, format='ICO', sizes=[(s, s) for s in ico_sizes])
print('已生成', ico_path)

# apple-touch-icon（180，iOS 会加圆角，所以用满幅底）
apple = render_icon(180)
apple_path = os.path.join(PUBLIC, 'apple-touch-icon.png')
apple.save(apple_path, 'PNG', optimize=True)
print('已生成', apple_path)
