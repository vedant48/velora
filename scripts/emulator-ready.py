"""Clear an observed launcher ANR on the disposable test device, never app errors."""
import subprocess,time,xml.etree.ElementTree as ET,re

def adb(*args):
    return subprocess.run(['adb',*args],capture_output=True,check=True).stdout
for attempt in range(2):
    for ready_attempt in range(4):
        adb('shell','uiautomator','dump','/sdcard/ready.xml')
        result=subprocess.run(['adb','shell','cat','/sdcard/ready.xml'],capture_output=True)
        if result.returncode==0: break
        time.sleep(2)
    else: raise RuntimeError('Device UI dump unavailable after bounded readiness retries')
    xml=result.stdout.decode()
    if "Pixel Launcher isn't responding" not in xml:
        print('Device has no launcher ANR dialog')
        break
    root=ET.fromstring(xml)
    target=next((n for n in root.iter('node') if n.get('text')=='Close app'),None)
    if target is None: raise RuntimeError('Launcher ANR has no Close app control')
    x1,y1,x2,y2=map(int,re.findall(r'\d+',target.get('bounds')))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
    time.sleep(2)
else:
    raise RuntimeError('Launcher ANR persisted after bounded recovery')
