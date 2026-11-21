"""Read-only, signed-out native smoke checks. No account/library mutations."""
import json, re, subprocess, time, xml.etree.ElementTree as ET
from pathlib import Path
out=Path('native-evidence');out.mkdir(exist_ok=True)
pkg='com.vedant.velora.preview'
def adb(*args,check=True):
    return subprocess.run(['adb',*args],check=check,capture_output=True).stdout

def snapshot(name):
    adb('shell','uiautomator','dump','/sdcard/window.xml',check=False)
    x=adb('shell','cat','/sdcard/window.xml').decode()
    (out/(name+'.xml')).write_text(x)
    (out/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'))
    return ET.fromstring(x)

def tap_label(label):
    root=snapshot('before-'+label.lower())
    for e in root.iter('node'):
        values=[e.get('text',''),e.get('content-desc','')]
        if any(v==label or v.startswith(label+',') or v.startswith(label+' tab') for v in values):
            a=list(map(int,re.findall(r'\d+',e.get('bounds',''))))
            if len(a)==4:
                adb('shell','input','tap',str((a[0]+a[2])//2),str((a[1]+a[3])//2));time.sleep(2);return True
    return False

adb('logcat','-c')
adb('shell','cmd','uimode','night','no')
adb('shell','monkey','-p',pkg,'-c','android.intent.category.LAUNCHER','1')
time.sleep(15)
results={'package':pkg,'signed_in':False}
snapshot('01-home-light')
results['search_tab_found']=tap_label('Search')
snapshot('02-search-light')
adb('shell','input','keyevent','4');time.sleep(2)
snapshot('03-back-light')
# Relaunch avoids assuming Android back leaves a particular tab active.
adb('shell','am','force-stop',pkg)
adb('shell','monkey','-p',pkg,'-c','android.intent.category.LAUNCHER','1');time.sleep(4)
results['profile_tab_found']=tap_label('Profile')
snapshot('04-profile-light')
adb('shell','cmd','uimode','night','yes');time.sleep(4)
snapshot('05-profile-system-dark')
adb('shell','am','force-stop',pkg)
adb('shell','monkey','-p',pkg,'-c','android.intent.category.LAUNCHER','1');time.sleep(5)
snapshot('06-home-dark')
(out/'logcat.txt').write_bytes(adb('logcat','-d','-t','3000'))
(out/'package.txt').write_bytes(adb('shell','dumpsys','package',pkg))
(out/'gfxinfo.txt').write_bytes(adb('shell','dumpsys','gfxinfo',pkg))
results['alive']=bool(adb('shell','pidof',pkg,check=False).strip())
(out/'results.json').write_text(json.dumps(results,indent=2))
print(results)
assert results['alive'],'App process not running at smoke check end'
