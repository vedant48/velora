"""Saved-theme vs device-theme mismatch cold start.

Precondition: the app has a saved DARK theme override (set by maestro flow A)
while the device is in LIGHT mode. Captures frames across a cold start to
prove the JS splash and app follow the saved theme with no light/dark
oscillation once JS runs. The pre-JS native splash follows the device
appearance (light) - that platform limitation is disclosed separately.
"""
import json
import subprocess
import time
from pathlib import Path

out = Path('photo-evidence')
out.mkdir(exist_ok=True)
pkg = 'com.vedant.velora'


def adb(*args, check=True):
    return subprocess.run(['adb', *args], check=check, capture_output=True).stdout


def stats(path):
    from PIL import Image
    im = Image.open(path).convert('RGB')
    w, h = im.size
    corners = [im.getpixel((8, 8)), im.getpixel((w - 9, 8)),
               im.getpixel((8, h - 9)), im.getpixel((w - 9, h - 9))]
    bg = tuple(round(sum(c[i] for c in corners) / 4) for i in range(3))
    return {'bg_rgb': bg}


adb('shell', 'cmd', 'uimode', 'night', 'no')  # device stays light
time.sleep(1)
adb('shell', 'am', 'force-stop', pkg)
time.sleep(1)
adb('shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1')
marks = [0.4, 0.8, 1.2, 1.6, 2.0, 2.6, 3.4, 4.5]
elapsed = 0.0
frames = []
for mark in marks:
    time.sleep(mark - elapsed)
    elapsed = mark
    name = f'mismatch-saveddark-devicelight-{mark}s'
    (out / f'{name}.png').write_bytes(adb('exec-out', 'screencap', '-p'))
    st = stats(out / f'{name}.png')
    st['mark_s'] = mark
    frames.append(st)

(out / 'mismatch-results.json').write_text(json.dumps({'frames': frames}, indent=2))
print(json.dumps({'frames': frames}, indent=2))
