import subprocess,time,pathlib,xml.etree.ElementTree as ET,re,json
out=pathlib.Path('store-captures');out.mkdir(exist_ok=True)
def adb(*args,check=True):
 r=subprocess.run(['adb',*args],capture_output=True,check=check)
 return r.stdout
def xml():
 adb('shell','uiautomator','dump','/sdcard/store.xml',check=False)
 s=adb('shell','cat','/sdcard/store.xml',check=False).decode(errors='replace')
 return ET.fromstring(s) if '<hierarchy' in s else ET.Element('empty')
def tap(label):
 for _ in range(10):
  root=xml()
  for n in root.iter('node'):
   if label in (n.get('content-desc'),n.get('text')):
    b=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
    if len(b)==4:
     adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2));return
  time.sleep(2)
 raise RuntimeError('Control not found: '+label)
def shot(name):
 (out/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'))
 adb('shell','uiautomator','dump','/sdcard/store.xml',check=False)
 (out/(name+'.xml')).write_bytes(adb('shell','cat','/sdcard/store.xml',check=False))
adb('install','/tmp/velora.apk')
adb('shell','cmd','uimode','night','yes')
adb('shell','settings','put','global','sysui_demo_allowed','1')
adb('shell','am','broadcast','-a','com.android.systemui.demo','-e','command','clock','-e','hhmm','1000')
adb('shell','am','broadcast','-a','com.android.systemui.demo','-e','command','battery','-e','level','100','-e','plugged','false')
(out/'package.txt').write_bytes(adb('shell','dumpsys','package','com.vedant.velora'))
adb('shell','monkey','-p','com.vedant.velora','1')
# Readiness is bounded; dismiss only the observed system-launcher error, not app errors.
for _ in range(15):
 root=xml(); nodes=list(root.iter('node'))
 if any("Pixel Launcher isn't responding"==n.get('text') for n in nodes):
  tap('Close app')
 if any(n.get('content-desc')=='Explore Movies' for n in nodes):break
 time.sleep(2)
else:raise RuntimeError('App did not become ready')
tap('Explore Movies')
time.sleep(35)
shot('movies-dark')
adb('shell','input','swipe','360','1050','360','480','650');time.sleep(12)
shot('movies-lower-dark')
tap('Explore TV Series');time.sleep(25);shot('series-dark')
tap('Explore All');time.sleep(20);shot('explore-dark')
(out/'complete.json').write_text(json.dumps({'apk':'v1.4.5','signed_out':True,'backend_mutations':False,'screens':['movies-dark','movies-lower-dark','series-dark','explore-dark']}))
