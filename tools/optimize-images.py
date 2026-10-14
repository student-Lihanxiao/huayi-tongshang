# -*- coding: utf-8 -*-
"""
图片优化：缩小超高分辨率 + 适度重压缩，在不影响观感的前提下减小体积。

用法：
  python tools/optimize-images.py            仅分析，不改文件
  python tools/optimize-images.py --apply    执行优化（原图备份到 shots/image-backup/）
  python tools/optimize-images.py --restore  从备份还原

优化策略：
  - 最长边超过 1000px 的缩放至 1000px（卡片显示 300px、详情页 600px，2x 屏也够）
  - JPEG 质量统一 82、渐进式、去元数据
  - PNG 保持原样（图标类本就很小，重压收益低且有损失风险）
"""
import os
import sys
import shutil
from PIL import Image

# Windows 控制台默认 GBK，输出 ✓ 之类的符号会抛 UnicodeEncodeError。
# 统一切到 UTF-8 并让无法编码的字符降级处理，避免脚本中途崩掉。
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = os.path.join(ROOT, 'public', 'images')
BACKUP = os.path.join(ROOT, 'shots', 'image-backup')

MAX_DIM = 1000
JPEG_QUALITY = 82


def human(n):
    return f'{n/1024:.0f} KB' if n < 1024 * 1024 else f'{n/1024/1024:.2f} MB'


def walk_images():
    out = []
    for dirpath, _, files in os.walk(IMAGES):
        for f in files:
            if f.lower().endswith(('.jpg', '.jpeg')):
                out.append(os.path.join(dirpath, f))
    return sorted(out)


def backup_path(p):
    rel = os.path.relpath(p, ROOT)
    return os.path.join(BACKUP, rel)


def do_backup(p):
    dst = backup_path(p)
    if os.path.exists(dst):
        return False           # 已备份过，不覆盖（保留最初的原图）
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(p, dst)
    return True


def restore():
    if not os.path.isdir(BACKUP):
        print('没有找到备份目录，无需还原。')
        return
    n = 0
    for dirpath, _, files in os.walk(BACKUP):
        for f in files:
            src = os.path.join(dirpath, f)
            rel = os.path.relpath(src, BACKUP)
            dst = os.path.join(ROOT, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
            n += 1
    print(f'已还原 {n} 张原图。')
    print('如需彻底清理备份：Remove-Item shots\\image-backup -Recurse -Force')


def optimize(apply=False):
    paths = walk_images()
    if not paths:
        print('未找到 JPEG 图片。')
        return

    total_before = 0
    total_after = 0
    changed = 0

    print(f'{"文件":<40} {"优化前":>9} {"优化后":>9} {"省下":>9}  说明')
    print('-' * 92)

    for p in paths:
        before = os.path.getsize(p)
        total_before += before

        with Image.open(p) as im:
            w, h = im.size
            im = im.convert('RGB')      # 去掉可能的 CMYK / 透明通道
            scale = min(1.0, MAX_DIM / max(w, h))
            if scale < 1.0:
                new_size = (max(1, int(w * scale)), max(1, int(h * scale)))
                im = im.resize(new_size, Image.LANCZOS)
            else:
                new_size = (w, h)

            if not apply:
                after = int(before * (new_size[0] * new_size[1]) / (w * h) * 0.72)
                rel = os.path.relpath(p, IMAGES).replace('\\', '/')
                note = f'{w}x{h} -> {new_size[0]}x{new_size[1]}' if scale < 1.0 else '仅重压缩'
                print(f'{rel:<40} {human(before):>9} {human(after):>9} {human(before-after):>9}  {note}')
                total_after += after
                continue

            # 真实写入：先备份，再压到临时文件，最后替换（避免中断损坏原图）
            do_backup(p)
            tmp = p + '.tmp.jpg'
            im.save(tmp, 'JPEG', quality=JPEG_QUALITY, optimize=True, progressive=True)
            after = os.path.getsize(tmp)

            if after < before:
                os.replace(tmp, p)
                changed += 1
                total_after += after
                rel = os.path.relpath(p, IMAGES).replace('\\', '/')
                note = f'{w}x{h} -> {new_size[0]}x{new_size[1]}' if scale < 1.0 else '重压缩'
                print(f'{rel:<40} {human(before):>9} {human(after):>9} {human(before-after):>9}  {note}')
            else:
                # 压不小就保留原图
                os.remove(tmp)
                total_after += before
                rel = os.path.relpath(p, IMAGES).replace('\\', '/')
                print(f'{rel:<40} {human(before):>9} {"(保留原图)":>9} {"-":>9}  已是最优')

    print('-' * 92)
    print(f'{"合计":<40} {human(total_before):>9} {human(total_after):>9} {human(total_before-total_after):>9}')

    if apply:
        print(f'\n✓ 已优化 {changed} 张图片，共省 {human(total_before-total_after)}')
        print(f'  原图备份在 shots/image-backup/ ，如需还原：')
        print(f'    python tools/optimize-images.py --restore')
    else:
        print('\n这是预演，未修改任何文件。执行优化请加 --apply')


if __name__ == '__main__':
    if '--restore' in sys.argv:
        restore()
    else:
        optimize(apply='--apply' in sys.argv)
