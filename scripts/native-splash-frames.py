"""Cold-start splash frame capture on an emulator. Read-only, signed-out.

Launches the installed app from force-stopped state in dark and light device
modes, capturing frames across the native splash -> JS splash -> app handoff.
Writes frames plus per-frame background/center color stats so the theme and
the presence of the red V are verifiable without eyeballing every frame.
"""
import json
import subprocess
import time
from pathlib import Path

out = Path('splash-evidence')
out.mkdir(exist_ok=True)
pkg = 'com.vedant.velora'


def adb(*args, check=True):
    return subprocess.run(['adb', *args], check=check, capture_output=True).stdout


def frame_stats(path):
    try:
        from PIL import Image
    except ImportError:
        return {}
    im = Image.open(path).convert('RGB')
    w, h = im.size
    corners = [im.getpixel((8, 8)), im.getpixel((w - 9, 8)),
               im.getpixel((8, h - 9)), im.getpixel((w - 9, h - 9))]
    bg = tuple(round(sum(c[i] for c in corners) / 4) for i in range(3))
    # center band where the V sits
    red = 0
    total = 0
    for y in range(int(h * 0.30), int(h * 0.55), 12):
        for x in range(int(w * 0.30), int(w * 0.70), 12):
            r, g, b = im.getpixel((x, y))
            total += 1
            if r > 120 and r > g * 1.8 and r > b * 1.8:
                red += 1
    return {'bg_rgb': bg, 'red_v_pixel_ratio': round(red / max(total, 1), 3)}


results = {'package': pkg, 'modes': {}}
for mode, night in (('dark', 'yes'), ('light', 'no')):
    adb('shell', 'cmd', 'uimode', 'night', night)
    time.sleep(2)
    adb('shell', 'am', 'force-stop', pkg)
    time.sleep(1)
    adb('logcat', '-c')
    adb('shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1')
    marks = [0.5, 1.0, 1.6, 2.4, 3.4, 5.0]
    elapsed = 0.0
    frames = []
    for mark in marks:
        time.sleep(mark - elapsed)
        elapsed = mark
        name = f'{mode}-{mark}s'
        (out / f'{name}.png').write_bytes(adb('exec-out', 'screencap', '-p'))
        stats = frame_stats(out / f'{name}.png')
        stats['mark_s'] = mark
        frames.append(stats)
    adb('shell', 'uiautomator', 'dump', '/sdcard/window.xml', check=False)
    (out / f'{mode}-window.xml').write_bytes(adb('shell', 'cat', '/sdcard/window.xml'))
    results['modes'][mode] = {
        'frames': frames,
        'alive': bool(adb('shell', 'pidof', pkg, check=False).strip()),
    }

(out / 'logcat.txt').write_bytes(adb('logcat', '-d', '-t', '2000'))
(out / 'results.json').write_text(json.dumps(results, indent=2))
print(json.dumps(results, indent=2))
assert all(m['alive'] for m in results['modes'].values()), 'App died during a cold start'
