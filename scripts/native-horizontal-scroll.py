"""Exercise actual APK carousel recycling signed out, preserving crash evidence."""
import json,re,subprocess,time,xml.etree.ElementTree as ET
from pathlib import Path
p=Path('native-evidence');p.mkdir(exist_ok=True);pkg='com.vedant.velora.preview'
def adb(*args):return subprocess.run(['adb',*args],capture_output=True,timeout=40).stdout
def capture(n):
 adb('shell','uiautomator','dump','/sdcard/window.xml');x=adb('shell','cat','/sdcard/window.xml').decode(errors='replace');(p/(n+'.xml')).write_text(x);(p/(n+'.png')).write_bytes(adb('exec-out','screencap','-p'));return x
r={'package':pkg,'signed_in':False,'gestures':[]}
adb('logcat','-c');adb('shell','monkey','-p',pkg,'-c','android.intent.category.LAUNCHER','1');time.sleep(25)
size=adb('shell','wm','size').decode();w,h=map(int,re.findall(r'(\d+)x(\d+)',size)[-1]);alive=True
try:
 capture('00-before-scroll')
 for section in range(4):
  if section:
   adb('shell','input','swipe',str(w//2),str(int(h*.8)),str(w//2),str(int(h*.35)),'650');time.sleep(2)
  for y in [.38,.58,.72]:
   for direction in ['left','right']:
    x1,x2=(.86,.14) if direction=='left' else (.14,.86)
    adb('shell','input','swipe',str(int(w*x1)),str(int(h*y)),str(int(w*x2)),str(int(h*y)),'500');time.sleep(1)
    alive=bool(adb('shell','pidof',pkg).strip());r['gestures'].append({'section':section,'y':y,'direction':direction,'alive':alive})
    if not alive:raise RuntimeError('APK process died during horizontal '+direction+' swipe')
  capture('section-'+str(section))
except Exception as e:r['error']=str(e)
finally:
 capture('99-after-scroll');r['alive']=alive
 (p/'logcat.txt').write_bytes(adb('logcat','-d'))
 (p/'crash.txt').write_bytes(adb('logcat','-b','crash','-d'))
 (p/'package.txt').write_bytes(adb('shell','dumpsys','package',pkg))
 (p/'activity.txt').write_bytes(adb('shell','dumpsys','activity','activities'))
 (p/'results.json').write_text(json.dumps(r,indent=2));print(r)
assert alive and 'error' not in r,'Horizontal swipe regression failed'
