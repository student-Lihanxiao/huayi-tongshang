# -*- coding: utf-8 -*-
"""
生成社交分享预览图（1200×630，微信/Twitter/Facebook 通用尺寸）
输出：public/images/og-cover.png

设计：宣纸底 + 水墨晕染 + 朱砂方印 + 楷体商标 + 四条非遗标签
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'images', 'og-cover.png')
os.makedirs(os.path.dirname(OUT), exist_ok=True)

W, H = 1200, 630
PAPER = (247, 241, 227)
PAPER_2 = (239, 228, 205)
CINNABAR = (168, 50, 31)
CINNABAR_DEEP = (125, 36, 21)
INK = (43, 38, 32)
INK_3 = (107, 95, 82)
GAMBOGE = (192, 138, 46)
JADE = (78, 122, 94)

KAI = [r'C:\Windows\Fonts\simkai.ttf', r'C:\Windows\Fonts\STKAITI.TTF']
SONG = [r'C:\Windows\Fonts\simsun.ttc', r'C:\Windows\Fonts\STSONG.TTF']
SANS = [r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\Deng.ttf']


def font(candidates, size):
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


img = Image.new('RGB', (W, H), PAPER)
d = ImageDraw.Draw(img, 'RGBA')

# ---------------------------------------------------------------- 宣纸底纹
# 纵向细微渐变，模拟纸面受光
for y in range(H):
    t = y / (H - 1)
    col = tuple(int(PAPER[i] + (PAPER_2[i] - PAPER[i]) * t * 0.55) for i in range(3))
    d.line([(0, y), (W, y)], fill=col)

# 角落水墨晕染（独立图层 + 高斯模糊，避免生硬边界）
blob = Image.new('RGBA', (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(blob)
bd.ellipse([-220, -200, 320, 260], fill=(78, 122, 94, 26))       # 左上：黛青
bd.ellipse([W - 340, H - 300, W + 200, H + 160], fill=(168, 50, 31, 22))  # 右下：朱砂
bd.ellipse([W - 180, -180, W + 200, 200], fill=(192, 138, 46, 24))       # 右上：缃色
blob = blob.filter(ImageFilter.GaussianBlur(70))
img.paste(blob, (0, 0), blob)


def center_text(draw, y, text, fnt, fill):
    bbox = draw.textbbox((0, 0), text, font=fnt)
    w = bbox[2] - bbox[0]
    draw.text(((W - w) / 2 - bbox[0], y), text, font=fnt, fill=fill)
    return bbox[3] - bbox[1]


# ---------------------------------------------------------------- 朱砂方印
SEAL = 132
sx, sy = (W - SEAL) // 2, 74
d.rounded_rectangle([sx, sy, sx + SEAL, sy + SEAL], radius=18,
                    fill=CINNABAR + (255,))
# 印面内框
d.rounded_rectangle([sx + 12, sy + 12, sx + SEAL - 12, sy + SEAL - 12], radius=9,
                    outline=(255, 255, 255, 150), width=3)
seal_font = font(KAI, 82)
bbox = d.textbbox((0, 0), '華', font=seal_font)
d.text((sx + (SEAL - (bbox[2] - bbox[0])) / 2 - bbox[0],
        sy + (SEAL - (bbox[3] - bbox[1])) / 2 - bbox[1]),
       '華', font=seal_font, fill=PAPER)

# ---------------------------------------------------------------- 商标与标语
center_text(d, 236, '华遗通商', font(KAI, 80), INK)
center_text(d, 336, '让世界看见中华非遗之美', font(KAI, 34), CINNABAR_DEEP)
center_text(d, 390, '本草 · 非遗 · 汉服 · 手作通商', font(SANS, 22), INK_3)

# ---------------------------------------------------------------- 分隔回纹
y_rule = 448
d.line([(W / 2 - 260, y_rule), (W / 2 - 40, y_rule)], fill=GAMBOGE + (170,), width=2)
d.line([(W / 2 + 40, y_rule), (W / 2 + 260, y_rule)], fill=GAMBOGE + (170,), width=2)
# 中间菱形
cx, cy, r = W / 2, y_rule, 9
d.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=GAMBOGE + (230,))

# ---------------------------------------------------------------- 四条标签
tags = [
    ('九种体质测评', CINNABAR),
    ('18 题完整量表', GAMBOGE),
    ('中英日韩', JADE),
    ('32 件非遗好物', INK_3),
]
tag_font = font(SANS, 21)
pad_x, tag_h = 22, 46
gaps = 16

# 先量总宽以求居中
widths = []
for text, _ in tags:
    bb = d.textbbox((0, 0), text, font=tag_font)
    widths.append(bb[2] - bb[0] + pad_x * 2)
total = sum(widths) + gaps * (len(tags) - 1)
x = (W - total) / 2
y = 496

for (text, color), tw in zip(tags, widths):
    d.rounded_rectangle([x, y, x + tw, y + tag_h], radius=tag_h // 2,
                        fill=(255, 253, 247, 235), outline=color + (170,), width=2)
    bb = d.textbbox((0, 0), text, font=tag_font)
    d.text((x + (tw - (bb[2] - bb[0])) / 2 - bb[0], y + (tag_h - (bb[3] - bb[1])) / 2 - bb[1]),
           text, font=tag_font, fill=color)
    x += tw + gaps

# ---------------------------------------------------------------- 底部回纹带
for i in range(0, W, 48):
    d.line([(i, H - 14), (i + 24, H - 14)], fill=GAMBOGE + (70,), width=2)
    d.line([(i + 12, H - 14), (i + 12, H - 24)], fill=GAMBOGE + (70,), width=2)

img.save(OUT, 'PNG', optimize=True)
print('已生成', OUT, f'({os.path.getsize(OUT)/1024:.0f} KB)')
