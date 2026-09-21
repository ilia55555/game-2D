"""Original score and sound design. Requires numpy and ffmpeg to rebuild, not to play."""
from pathlib import Path
import numpy as np, wave, subprocess, tempfile, math
ROOT=Path(__file__).resolve().parents[1]/'assets/audio';SR=32000
rng=np.random.default_rng(931)
def freq(n):return 440*2**((n-69)/12)
def tone(note,duration,voice='lead'):
 t=np.arange(int(SR*duration))/SR;f=freq(note)
 if voice=='keys':
  sig=np.sin(2*np.pi*f*t+1.6*np.sin(2*np.pi*f*2*t)*np.exp(-t*7))*.7+np.sin(2*np.pi*f*3*t)*.12
  env=np.minimum(t/.006,1)*np.exp(-t*3.1)
 elif voice=='bass':
  sig=np.sin(2*np.pi*f*t)+.26*np.sin(2*np.pi*f*2*t)+.12*np.sin(2*np.pi*f*3*t)
  env=np.minimum(t/.005,1)*np.exp(-t*3)
 elif voice=='pad':
  sig=(np.sin(2*np.pi*f*t)+np.sin(2*np.pi*f*1.003*t)+.4*np.sin(2*np.pi*f*2*t))/2.4
  env=np.minimum(t/.25,1)*np.minimum((duration-t)/.3,1)*.65
 elif voice=='bell':
  sig=np.sin(2*np.pi*f*t+np.sin(2*np.pi*f*3*t)*np.exp(-t*5))
  env=np.minimum(t/.004,1)*np.exp(-t*4)
 else:
  sig=.7*np.sin(2*np.pi*f*t+1.4*np.sin(2*np.pi*f*t)*np.exp(-t*9))+.2*np.sin(2*np.pi*f*2*t)+.1*np.sin(2*np.pi*f*3*t)
  env=np.minimum(t/.008,1)*np.minimum((duration-t)/.08,1)*np.exp(-t*1.5)
 return sig*env*np.minimum((duration-t)/.01,1)
def drum(kind):
 d={'kick':.26,'snare':.18,'hat':.065,'open':.23}[kind];t=np.arange(int(SR*d))/SR
 noise=rng.uniform(-1,1,len(t))
 if kind=='kick':return np.sin(2*np.pi*(47*t+65*(1-np.exp(-t*30))/30))*np.exp(-t*16)
 if kind=='snare':return (noise*.65+np.sin(2*np.pi*185*t)*.25)*np.exp(-t* 20)
 return (noise-np.roll(noise,1))*.3*np.exp(-t*(65 if kind=='hat' else 20))
DR={x:drum(x) for x in ['kick','snare','hat','open']}
def wav(path,arr):
 arr=np.clip(arr,-.98,.98);arr=(arr*32767).astype('<i2')
 with wave.open(str(path),'wb') as f:f.setnchannels(1 if arr.ndim==1 else 2);f.setsampwidth(2);f.setframerate(SR);f.writeframes(arr.tobytes())
def compose(name,bpm,key,style):
 beat=60/bpm;bars=16;length=int(bars*4*beat*SR);mix=np.zeros((length,2))
 def add(sig,when,amp,pan=0):
  start=int(when*beat*SR);ids=(start+np.arange(len(sig)))%length
  mix[ids,0]+=sig*amp*math.sqrt((1-pan)/2);mix[ids,1]+=sig*amp*math.sqrt((1+pan)/2)
 progression=[0,5,3,7] if style!=5 else [0,0,8,7]
 scale=[0,2,3,5,7,9,10] if style in [0,1,6] else [0,2,3,5,7,8,10]
 motif=[0,4,6,4,2,3,1,0,4,5,6,8,7,6,4,2]
 for bar in range(bars):
  root=key+progression[(bar//2)%4];at=bar*4
  chord=[root+12,root+15,root+19,root+22]
  for n in chord:add(tone(n,beat*4.3,'pad'),at,.045,-.35)
  for off in [0,.75,1.5,2.5,3.25]:
   for n in chord:add(tone(n+12,beat*.65,'keys'),at+off,.042,.25)
  for j,off in enumerate([0,.75,1.5,2,2.75,3.5]):add(tone(root-12+[0,0,7,0,10,7][j],beat*.43,'bass'),at+off,.28,-.08)
  offsets=[0,.5,.75,1.5,2,2.75,3,3.5]
  if bar%4==3:offsets=[0,.75,1.25,2,2.5,3,3.25,3.5]
  for j,off in enumerate(offsets):
   if bar in [6,14] and j>3:continue
   ix=(motif[(j+(bar%2)*8+style)%16]+(2 if bar>=8 else 0));note=key+24+scale[ix%7]+12*(ix//7)
   dur=beat*(.42 if j%3 else .7);voice='bell' if style==2 else 'lead'
   sig=tone(note,dur,voice);add(sig,at+off,.105,.1)
   add(sig,at+off+.75,.024,-.6)
  for off in [0,1.5,2,3.25]:add(DR['kick'],at+off,.31)
  for off in [1,3]:add(DR['snare'],at+off,.18,.03)
  for k in range(8):add(DR['hat'],at+k*.5+(0.035 if k%2 else 0),.10 if k%2 else .14,(-1 if k%2 else 1)*.45)
  add(DR['open'],at+3.5,.09,.4)
  if bar%4==3:
   for off in [3.25,3.5,3.75]:add(DR['snare'],at+off,.07)
 # Soft limiter, sensible headroom, seamless cyclic delay.
 mix+=np.roll(mix,int(beat*.75*SR),axis=0)*.10
 mix=np.tanh(mix*1.35)*.79
 peak=np.max(np.abs(mix));mix*=.88/max(peak,.88)
 with tempfile.TemporaryDirectory() as temp:
  source=Path(temp)/'music.wav';wav(source,mix)
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-c:a','libvorbis','-q:a','3',str(ROOT/'music'/f'{name}.ogg')],check=True)
 print(name,round(len(mix)/SR,1),'s',flush=True)
for name,bpm,key,style in [('menu',108, 50,6),('stage_0',126, 50,0),('stage_1',136,55,1),('stage_2',112,57,2),('stage_3',144,48,3),('stage_4',132, 50,4),('boss',156,47,5)]:compose(name,bpm,key,style)
for name in ['shoot','jump','dash','hit','explode','gem','checkpoint','spring','heal','ui','win','alarm']:
 d={'shoot':.13,'jump':.24,'dash':.22,'hit':.23,'explode':.6,'gem':.22,'checkpoint':.8,'spring':.35,'heal':.5,'ui':.07,'win':1.8,'alarm':.5}[name];t=np.arange(int(d*SR))/SR
 if name in ['gem','checkpoint','heal','win']:
  sig=np.zeros_like(t);notes={'gem':[84,91],'checkpoint':[72,76,79,84],'heal':[76,79,84],'win':[62,66,69,74,78,81,86]}[name]
  for j,n in enumerate(notes):
   start=int(j*d/len(notes)*SR);tone_part=tone(n,d-j*d/len(notes),'bell');sig[start:start+len(tone_part)]+=tone_part*.36
 elif name=='explode':sig=(rng.uniform(-1,1,len(t))*.6+np.sin(2*np.pi*55*t)*.4)*np.exp(-t*9)
 elif name=='hit':sig=(rng.uniform(-1,1,len(t))*.5+np.sin(2*np.pi*(160*t-200*t*t))*.5)*np.exp(-t*16)
 elif name=='dash':sig=(rng.uniform(-1,1,len(t))*.3+np.sin(2*np.pi*(180*t+1100*t*t))*.2)*np.sin(np.pi*t/d)**2
 elif name=='alarm':sig=np.sin(2*np.pi*(440*t+70*np.sin(t*15)))*np.sin(np.pi*t/d)*.32
 else:
  f0,f1={'shoot':(1000,170),'jump':(290,900),'spring':(140,1300),'ui':(850,1100)}[name]
  sig=np.sin(2*np.pi*(f0*t+(f1-f0)/(2*d)*t*t))*np.sin(np.pi*t/d)*.4
 sig*=np.minimum(t/.004,1)*np.minimum((d-t)/.012,1)
 wav(ROOT/'sfx'/f'{name}.wav',sig*.65)
print('Original audio complete')
