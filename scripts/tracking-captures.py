import subprocess,time,pathlib,xml.etree.ElementTree as ET,re,json
out=pathlib.Path('tracking-captures');out.mkdir(exist_ok=True)
def adb(*args,check=True):return subprocess.run(['adb',*args],capture_output=True,check=check).stdout
def xml():
 adb('shell','uiautomator','dump','/sdcard/store.xml',check=False)
 s=adb('shell','cat','/sdcard/store.xml',check=False).decode(errors='replace');return ET.fromstring(s) if '<hierarchy' in s else ET.Element('empty')
def hit(n):
 b=list(map(int,re.findall(r'\d+',n.get('bounds',''))));adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
def find(label,cls=None):
 nodes=list(xml().iter('node'));matches=[n for n in nodes if n.get('content-desc')==label and (not cls or n.get('class')==cls)]+[n for n in nodes if n.get('text')==label and (not cls or n.get('class')==cls)];return matches[0] if matches else None
def tap(label,cls=None):
 for _ in range(10):
  n=find(label,cls)
  if n is not None:hit(n);return
  time.sleep(2)
 raise RuntimeError('Control not found '+label)
def shot(name):
 (out/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'));(out/(name+'.xml')).write_bytes(adb('shell','cat','/sdcard/store.xml',check=False))
def scrollto(label):
 for _ in range(9):
  n=find(label)
  if n is not None:return n
  adb('shell','input','swipe','360','1060','360','400','550');time.sleep(2)
 raise RuntimeError('Scroll target absent '+label)
adb('reverse','tcp:8787','tcp:8787');adb('install','candidate/permission-test.apk');adb('shell','wm','size','720x1280');adb('shell','wm','density','320');adb('shell','cmd','uimode','night','yes');adb('shell','monkey','-p','com.vedant.velora','1');time.sleep(10)
tap('Log in / Sign up');time.sleep(3)
# Exact EditText role prevents matching decorative labels.
for label,value in [('Username','e2e_alice'),('Password','e2e-alice-pass-1')]:
 fields=[n for n in xml().iter('node') if n.get('class')=='android.widget.EditText'];target=fields[0 if label=='Username' else 1];hit(target);adb('shell','input','text',value);adb('shell','input','keyevent','4');time.sleep(1)
tap('Log in','android.widget.TextView');time.sleep(10)
try:
 tap('Demo library');shot('want')
 tap('Watched');time.sleep(4);shot('watched')
 tap('Series');time.sleep(4);shot('series')
 tap('Breaking Bad','android.widget.Button');time.sleep(12)
 scrollto('All episodes');adb('shell','input','swipe','360','1040','360','650','500');time.sleep(3);shot('episode-before')
 n=scrollto('Pilot');b=list(map(int,re.findall(r'\d+',n.get('bounds',''))));y=(b[1]+b[3])//2
 adb('shell','input','swipe','85',str(y),'650',str(y),'700');time.sleep(5);shot('episode-after')
 adb('shell','input','keyevent','4');time.sleep(3)
 tap('Search');time.sleep(2)
 fields=[n for n in xml().iter('node') if n.get('class')=='android.widget.EditText'];hit(fields[0]);adb('shell','input','text','The%sMartian');time.sleep(10);adb('shell','input','keyevent','4');time.sleep(2)
 tap('The Martian','android.widget.Button');time.sleep(12);shot('add-controls');tap('Want','android.widget.Button');time.sleep(4);shot('added-want')
 (out/'complete.json').write_text(json.dumps({'local_demo':True,'screens':7,'production_mutations':False}))
except Exception:
 shot('failure');raise
