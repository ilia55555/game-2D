"""Rebuild the original vector artwork. Python standard library only; no downloads."""
from pathlib import Path
import math, random
ROOT=Path(__file__).resolve().parents[1]/'assets/art'
DEFS='''<defs>
 <linearGradient id="fur" x2=".25" y2="1"><stop stop-color="#99ffee"/><stop offset=".4" stop-color="#35c7b6"/><stop offset="1" stop-color="#12697b"/></linearGradient>
 <linearGradient id="cream" x2=".5" y2="1"><stop stop-color="#fff4d9"/><stop offset="1" stop-color="#ddae78"/></linearGradient>
 <linearGradient id="armor" x2=".3" y2="1"><stop stop-color="#557794"/><stop offset=".48" stop-color="#233953"/><stop offset="1" stop-color="#101d33"/></linearGradient>
 <linearGradient id="gold" x2=".4" y2="1"><stop stop-color="#fff0a5"/><stop offset=".45" stop-color="#ffbe4b"/><stop offset="1" stop-color="#c36036"/></linearGradient>
 <linearGradient id="metal" x2=".4" y2="1"><stop stop-color="#e6f6fa"/><stop offset=".5" stop-color="#90adbb"/><stop offset="1" stop-color="#445575"/></linearGradient>
 <linearGradient id="red" x2=".2" y2="1"><stop stop-color="#ffc7a0"/><stop offset=".35" stop-color="#f76960"/><stop offset="1" stop-color="#8c3457"/></linearGradient>
 <linearGradient id="glass" x2=".2" y2="1"><stop stop-color="#ecffff"/><stop offset=".24" stop-color="#7dfde6"/><stop offset="1" stop-color="#2290ba"/></linearGradient>
 <radialGradient id="glow"><stop stop-color="#aefff3" stop-opacity=".55"/><stop offset="1" stop-color="#30d9d1" stop-opacity="0"/></radialGradient>
 </defs>'''
def svg(path,w,h,body,view=None):
 p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True)
 density=3 if str(path).startswith('hero/') else 1
 p.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w*density}" height="{h*density}" viewBox="{view or f"0 0 {w} {h}"}">{DEFS}{body}</svg>')
def path(d,fill,sw=2,extra=''):
 outline = '' if 'stroke=' in extra else ' stroke="#10283a"'
 return f'<path d="{d}" fill="{fill}"{outline} stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'
def ellipse(cx,cy,rx,ry,fill,sw=0):
 return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="#12253b" stroke-width="{sw}"/>'
def circle(x,y,r,fill):return ellipse(x,y,r,r,fill)
def rect(x,y,w,h,fill,rx=0,stroke='none',sw=1):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
# Hero SVGs rasterize at 3x authored resolution; origins are set by the animation rig.
svg(Path('hero/head.svg'),104,90,
 path('M15 54 Q8 32 27 19 L32 8 43 16 55 9 64 18 Q85 15 88 36 L94 44 87 55 Q81 75 51 79 L37 74 25 81 28 65 15 68Z','url(#fur)')+
 path('M61 48 Q72 43 80 52 Q97 48 99 59 Q99 76 75 76 Q54 76 48 64Z','url(#cream)')+
 path('M82 55 Q99 49 101 56 L94 64 85 63Z','#122a3b')+
 path('M25 27 Q52 14 82 27 L83 47 Q57 53 33 47Z','url(#armor)')+
 path('M39 30 Q56 23 77 30 L75 43 45 43Z','url(#glass)',1.5)+
 path('M44 30 L54 28 46 41 42 40Z','#e9fffc',0)+
 path('M62 31 L69 31 67 43 61 42Z','#163a54',0)+
 path('M33 23 Q54 17 73 21','#81ffe8',2)+circle(28,37,9,'url(#gold)')+circle(28,37,4,'#213751')+
 path('M73 67 Q82 70 87 65','none',1.7)+path('M49 64 L52 71 57 68','#fffcde',1)+path('M22 53 L32 55 22 59','#53d7c4',0))
svg(Path('hero/ear.svg'),38,104,
 path('M13 99 Q3 68 8 23 Q10 -5 22 6 Q39 24 28 70 L26 97Z','url(#fur)',2.5)+
 path('M17 83 Q13 58 17 24 Q20 8 25 29 Q29 54 22 83Z','url(#cream)',0)+
 path('M11 22 Q10 53 14 62','none',2, 'stroke="#a8fff0"'))
svg(Path('hero/body.svg'),70,86,
 path('M22 4 Q40 -1 50 13 L64 47 51 79 Q32 89 13 70 L9 32Z','url(#fur)',3)+
 path('M21 21 L49 18 55 56 42 73 19 64 13 39Z','url(#armor)',2)+
 path('M21 27 L39 24 43 33 21 37Z','#6995a4',0)+
 path('M18 47 L51 43 52 56 20 61Z','#15263e',0)+
 circle(35,42,12,'url(#gold)')+circle(35,42,7,'#123e54')+path('M34 33 L29 44 35 43 32 51 42 39 35 40Z','#a4ffdb',0)+
 path('M15 68 L48 70 46 79 19 78Z','url(#metal)',2)+rect(31,68,10,13,'url(#gold)',2))
svg(Path('hero/upper_arm.svg'),28,42,path('M8 3 Q22 0 25 14 L23 34 Q17 44 6 35 L3 17Z','url(#fur)',2)+ellipse(14,12,12,10,'url(#armor)',1.5)+path('M6 10 L20 7','none',2,'stroke="#82a8b2"'))
svg(Path('hero/forearm.svg'),32,43,path('M6 5 L24 5 26 25 30 29 26 39 9 40 3 31Z','url(#armor)',2)+path('M8 8 L23 7 22 20 7 23Z','url(#metal)',1)+path('M11 12 L20 11','none',2,'stroke="#a9ffea"'))
svg(Path('hero/thigh.svg'),32,45,path('M6 3 Q19 -3 27 7 L25 34 Q21 44 8 39 L3 17Z','url(#fur)',2)+path('M9 9 L26 9 24 24 10 26Z','url(#armor)',1.5)+path('M10 12 L21 11','none',2,'stroke="#769daf"'))
svg(Path('hero/shin.svg'),30,44,path('M7 3 L23 3 27 32 22 41 4 38 3 21Z','url(#armor)',2)+path('M7 8 L20 7 22 25 9 29Z','url(#metal)',1.5)+path('M13 12 L17 12 18 25 13 26Z','#7affdf',0))
svg(Path('hero/boot.svg'),57,30,path('M5 2 L27 2 31 12 Q46 11 51 18 L53 25 4 25 2 15Z','url(#gold)',2.5)+path('M2 24 L54 23 53 29 3 29Z','url(#armor)',2)+path('M31 15 L44 16','none',2,'stroke="#fff3b3"')+path('M10 5 L23 5 24 13 9 13Z','#965330',0))
svg(Path('hero/scarf.svg'),90,36,path('M85 5 Q61 13 49 7 Q28 0 5 8 L15 17 2 28 Q31 23 50 27 Q72 30 88 17Z','url(#gold)',2)+path('M75 14 Q45 13 24 14','none',2,'stroke="#ffe898"'))
svg(Path('hero/tail.svg'),74,62,path('M71 16 Q59 6 41 10 Q20 12 10 3 L16 18 3 13 8 28 2 30 Q27 61 54 49 L71 35Z','url(#fur)',2)+path('M8 15 L13 25 5 28 Q13 40 32 45 L31 27 40 24 29 13 Q16 13 10 6Z','url(#cream)',1))
svg(Path('hero/gun.svg'),112,56,
 path('M9 16 L23 8 79 8 88 18 104 18 108 34 86 37 76 42 40 39 35 51 23 48 24 35 8 32Z','url(#armor)',2.5)+
 path('M24 11 L66 11 76 20 72 31 23 28Z','url(#metal)',1.5)+rect(34,15,30,7,'url(#glass)',2)+
 path('M12 22 L26 22 29 33 13 32Z','url(#gold)',1)+rect(78,14,12,26,'url(#gold)',3,'#192e42',2)+rect(89,18,16,17,'url(#metal)',2,'#192e42',2)+rect(102,19,7,15,'url(#glass)',2)+
 path('M40 30 L63 32','none',2,'stroke="#597792"')+circle(71,20,3,'#cfffea'))
# Enemy chassis and mechanical details; independent legs, wings, turret and core animate in Godot.
for kind in ['crawler','hopper','turret','drone','sentinel']:
 body=''
 if kind=='drone':
  body=path('M6 51 L27 29 48 35 64 22 94 24 109 36 134 29 154 50 135 67 109 61 98 80 61 80 49 63 27 70Z','url(#armor)',3)
  body+=path('M43 43 L61 30 97 30 113 48 97 70 60 70Z','url(#metal)',2)
  body+=ellipse(80,49,25,17,'url(#red)',2)+ellipse(80,49,13,12,'#19293f',2)+circle(84,48,7,'#ffe6a6')
  body+=path('M7 47 L35 39 29 50 11 55Z','url(#gold)',1)+path('M152 46 L124 39 130 53 148 55Z','url(#gold)',1)
  body+=rect(70,72,20,12,'url(#gold)',3)
 elif kind=='turret':
  body=path('M23 90 L35 73 34 41 48 17 100 17 118 41 114 75 136 90Z','url(#armor)',3)
  body+=path('M43 32 L54 21 99 24 108 46 98 66 45 66Z','url(#metal)',2)
  body+=path('M49 47 L75 36 103 45 96 56 55 59Z','url(#red)',2)+rect(20,81,114,13,'url(#gold)',3,'#17283d',2)
  body+=circle(77,44,8,'#1d263d')+circle(77,44,4,'#fff0a0')
 elif kind=='sentinel':
  body=path('M18 79 L28 31 48 10 103 9 133 32 141 83 115 100 37 100Z','url(#armor)',3)
  body+=path('M40 15 L63 8 101 13 115 47 96 66 47 61 29 36Z','url(#red)',3)
  body+=path('M51 31 L107 30 102 47 55 49Z','#152c43',2)+rect(62,35,34,5,'#fff0ad',2)
  body+=path('M17 51 L44 52 49 89 22 98 10 79Z','url(#metal)',2)+path('M112 51 L138 44 154 84 133 95 111 85Z','url(#metal)',2)
  body+=rect(61,67,35,25,'url(#gold)',4)+circle(78,78,7,'#163d52')
 else:
  body=path('M18 68 Q10 27 48 16 L70 6 103 17 Q133 27 140 64 L125 87 33 88Z','url(#red)' if kind=='hopper' else 'url(#armor)',3)
  body+=path('M30 56 Q31 24 67 20 Q107 21 123 56 L110 67 44 66Z','url(#metal)',2)
  body+=path('M36 54 L123 51 113 72 43 75Z','#182439',2)+ellipse(90,59,18,9,'#ffad6e')+ellipse(94,58,6,7,'#fff2b1')
  body+=path('M24 74 L48 76 46 89 21 85Z','url(#gold)',2)+path('M100 77 L130 71 139 85 107 91Z','url(#gold)',2)
  for x in [52,67,82]:body+=path(f'M{x} 27 L{x-5} 44','none',3,'stroke="#607b8f"')
 svg(Path(f'enemies/{kind}.svg'),160,110,body)
svg(Path('enemies/leg.svg'),36,58,path('M13 3 L27 7 25 27 16 37 31 43 32 54 5 53 3 39 13 23Z','url(#metal)',2)+circle(18,25,7,'url(#gold)')+circle(18,25,3,'#23324a'))
svg(Path('enemies/wing.svg'),96,34,path('M3 30 L22 6 81 3 94 11 66 26Z','url(#metal)',2)+path('M24 10 L72 7 57 19 16 25Z','url(#glass)',1))
# Five individually illustrated boss silhouettes.
for i,(name,col) in enumerate([('warden','#64d5ac'),('manta','#ffc265'),('oracle','#ba97ff'),('titan','#ff885e'),('varkon','#fc7096')]):
 b=''
 if i==1:
  b+=path('M7 99 L64 43 103 16 117 62 153 79 193 64 207 17 246 44 311 99 278 142 224 129 187 170 135 170 98 129 46 145Z','url(#armor)',5)
  b+=path('M24 98 L87 44 101 65 77 111 49 126Z','url(#gold)',3)+path('M297 99 L235 43 222 64 246 112 275 126Z','url(#gold)',3)
  b+=ellipse(160,101,61,41,'url(#metal)',4)+ellipse(160,110,34,24,col,3)
  for x in [118,160,202]: b+=rect(x-8,143,16,41,'url(#armor)',4,'#101e33',3)+ellipse(x,185,10,6,col,2)
 elif i==2:
  b+=path('M160 9 L222 49 208 75 258 98 241 139 260 182 217 217 189 196 159 231 129 195 102 218 59 185 79 138 62 94 112  75 Z','url(#armor)',4)
  b+=path('M160 19 L214 64 189 104 209 150 161 213 108 153 129 108 108 64Z',col,4)
  b+=path('M160 35 L165 111 198 145 161 196 153 117 122 72Z','#e5e4ff',1)
  b+=ellipse(160,119,35,27,'url(#armor)',3)+ellipse(160,119,19,15,'url(#glass)',2)
  b+=path('M28 106 L61 84 79 123 54 161 21 146Z','url(#metal)',3)+path('M292 106 L260 83 242 123 266 161 301 146Z','url(#metal)',3)
 else:
  # Broad shoulders, articulated gauntlets, a face rather than an unidentifiable blob.
  b+=path('M67 85 L92  45 132 28 190 28 226 45 247 89 226 178 95 178Z','url(#armor)',5)
  b+=path('M95 72 L126 52 195 52 223 75 206 153 163 172 115 152Z','url(#metal)',3)
  b+=path('M121 54 L124 23 147 12 185 14 205 32 202  60 174 78 141 74Z',col,4)
  if i==0:b+=path('M121 32 L100 9 100 42 129 54Z','url(#gold)',3)+path('M200 32 L225 6 220 44 192 54Z','url(#gold)',3)
  if i==3:b+=path('M137 18 L130 2 154 13 171 1 181 16 201 4 199 30Z','url(#gold)',3)
  if i==4:b+=path('M125 27 L100 0 109 46 132 47Z','url(#red)',3)+path('M198 27 L226 0 214 47 192 49Z','url(#red)',3)
  b+=path('M134 38 L194 36 190 52 142 55Z','#122639',3)+path('M142 42 L158 45 156 50 140 47Z','#fff5b3',0)+path('M187 41 L170 45 172 50 189 46Z','#fff5b3',0)
  b+=path('M38 78 L70 62 98 90 85 139 99 164 74 197  30 177 22 118Z','url(#armor)',4)
  b+=path('M226 87 L254 60 282  78 300 120 285 177 249 196 224 164 237 139Z','url(#armor)',4)
  b+=path('M29 112 L79 110 81 145 48 157 25 139Z',col,3)+path('M241 111 L292 115 293 140 264 157 240 144Z',col,3)
  b+=ellipse(160,115,30,30,'url(#gold)',3)+ellipse(160,115,21,21,'#172c43',3)+ellipse(160,115,13,13,col)+ellipse(155,109,5,5,'#fff8df')
  for x in [105,180]:b+=path(f'M{x} 168 L{x+40} 168 {x+38} 204 {x+49} 216 {x+44} 229 {x-10} 229 {x-12} 211Z','url(#armor)',3)+rect(x-4,206, 40,9,col,3)
  for x in [44,255]:b+=circle(x,99,8,'url(#gold)')+circle(x,99,3,'#152c43')
 # Mechanical engraving and a different silhouette for each guardian.
 if i==0:
  moss=path('M86 72 Q71 42 76 29 L90 46 98 22 108 42 120 16 117 63Z','#357c63',2)
  moss+=path('M218 64 L237 28 244 48 260 24 255 68 242 84Z','#459c74',2)
  moss+=path('M91 105 Q114 126 97 153 Q76 163 85 185','none',4,'stroke="#7cb37c"')
  b=moss+b
  for x,y in [(87,84),(219,82),(107,146)]:b+=path(f'M{x} {y} q-16 -22 -29 -7 q13 19 29 7 M{x} {y} q4 -27 20 -23 q1 18 -20 23','#87bf88',1)
 if i==3:
  b=path('M68 89 L53 24 76 13 91 79 M229 76 L245 13 268 24 255 95','none',18,'stroke="#4d4a59"')+b
  for x in [54,251]:
   b+=rect(x,34,18,7,'url(#gold)',2)+rect(x,49,18,7,'url(#gold)',2)
  for y in [82,92,145]:b+=path(f'M132 {y} L188 {y}','none',3,'stroke="#eb9665"')
 if i==4:
  b=path('M91  sixty L49 36 22 102 5 226 55 201 89 228 125 177 207 175 231 225 264 198 312 221 293 100 267 34 221 59Z'.replace('sixty','60'),'#582f60',4)+b
  b+=path('M99 60 L74 26 70 62 43 52 63 86 M222 59 L246 24 248 65 278 50 255 86','none',7,'stroke="#c794d4"')
  b+=path('M143 13 L146 1 160 9 174 0 185 15Z','url(#gold)',2)
 if i in [0,3,4]:
  # Extract the arm groups so their pivots can swing, recoil and telegraph independently.
  arms=[path('M38 78 L70 62 98 90 85 139 99 164 74 197 30 177 22 118Z','url(#armor)',4)+path('M29 112 L79 110 81 145 48 157 25 139Z',col,3)+circle(44,99,8,'url(#gold)')+circle(44,99,3,'#152c43'),
        path('M226 87 L254 60 282 78 300 120 285 177 249 196 224 164 237 139Z','url(#armor)',4)+path('M241 111 L292 115 293 140 264 157 240 144Z',col,3)+circle(255,99,8,'url(#gold)')+circle(255,99,3,'#152c43')]
  import re
  for side,arm in enumerate(arms):
   for element in re.findall(r'<(?:path|ellipse) [^>]*/>',arm):b=b.replace(element,'')
   arm+=path('M35 121 L70 120 M32 127 L69 127','none',2,'stroke="#f0d6be"') if side==0 else path('M250 122 L283 123 M251 128 L286 129','none',2,'stroke="#f0d6be"')
   svg(Path(f'bosses/{name}_arm_{side}.svg'),320,240,arm)
  for x in [112,202]:b+=circle(x,93,4,'url(#gold)')+circle(x,149,3,'url(#metal)')
 else:
  for x,y in ([(63,82),(252,81),(126,89),(194,90)] if i==1 else [(132,73),(191,74),(116,165),(203,164)]):
   b+=circle(x,y,5,'url(#gold)')+circle(x,y,2,'#243247')
 svg(Path(f'bosses/{name}.svg'),320,240,b)
# World props, all native SVG; distant scenery generated with repeatable hand-authored motifs.
def canopy(x,y,w,h,c):
 return path(f'M{x-w*.50} {y+h*.2} C{x-w*.7} {y-h*.1} {x-w*.44} {y-h*.35} {x-w*.29} {y-h*.30} C{x-w*.22} {y-h*.69} {x+w*.04} {y-h*.70} {x+w*.14} {y-h*.37} C{x+w*.45} {y-h*.53} {x+w*.68} {y-h*.14} {x+w*.49} {y+h*.11} Q{x+w*.66} {y+h*.46} {x+w*.2} {y+h*.40} Q{x} {y+h*.70} {x-w*.19} {y+h*.39} Q{x-w*.49} {y+h*.53} {x-w*.50} {y+h*.2}Z',c,0)
# Shaped crowns and bark use the same readable silhouette language as the characters.
tree=path('M111 616 L158 581 Q191 414 168 202 L206 176 Q228 397 245 567 L302 618 236 609 204 590 181 614Z','#17444a',2)
tree+=path('M194 481 Q112 377 57 339 L76 325 Q149 354 204 437 M210 348 Q266 290 341 262 L333 281 Q260 319 221 394','none',19,'stroke="#225858"')
tree+=path('M195 566 Q208 395 191 276 M224 574 Q218 490 213 431','none',5,'stroke="#377767"')
for x,y,w,h,c in [(99,229,154,106,'#1c5a54'),(277,210,190,127,'#245f59'),(199,151,228,156,'#2b7665'),(86,143,120,106,'#3c8c6e'),(289,124,152,111,'#479976'),(184,81,183,112,'#63ae83')]:
 tree+=canopy(x,y,w,h,c)
 tree+=path(f'M{x-w*.24} {y-h*.18} Q{x-w*.06} {y-h*.36} {x+w*.10} {y-h*.22}','none',4,'stroke="#9bd09b" opacity=".3"')
for x,y in [(125,218),(267,201),(165,286)]:
 tree+=path(f'M{x} {y} Q{x+20} {y+68} {x-5} {y+115}','none',3,'stroke="#69a17a"')
 for j in range(3):tree+=path(f'M{x+2} {y+35+j*22} q-26 -19 -24 2 q12 11 24 -2','#70ac83',0)
svg(Path('world/tree.svg'),400,620,tree)
svg(Path('world/fern.svg'),160,125,''.join(path(f'M80 124 Q{35 if i<4 else 129} {60-i*4} {10+i*19} {15+abs(i-3)*7} Q{50 if i<4 else 111} 82 80 124Z',c,0) for i,c in enumerate(['#25695e','#30816c','#3f9977','#65b485','#8ccf92','#50a87d','#307c69'])))
svg(Path('world/crystal.svg'),110,170,path('M13 139 L10 75 28 42 50 137Z','#538ab8',2)+path('M35 141 L34 42 61 4  80 49 83 141Z','url(#glass)',2)+path('M82 148 L70 86 99 53 105 110 92 151Z','#a398ef',2)+path('M35 42 L61 4 58 136Z','#cefef4',0)+path('M14 144 L85 134 106 156 89 169 9 163Z','url(#armor)',2))
svg(Path('world/pillar.svg'),170,420,
 path('M11 411 L16 377 31 373 27 56 11 48 18 16 57 8 71 23 144 14 160 43 140 60 139 373 156 382 160 413Z','#314c5d',3)+
 path('M44 69 L72 76 71 370 41 370Z','#5b7780',0)+path('M91 70 L117 65 116 369 90 369Z','#263c50',0)+
 path('M78 94 L102  94 103 173 86 187 88 238 105 251 105 341','none',5,'stroke="#88c9b1"')+
 path('M15 39 L143 34 M25 386 L147 386','none',4,'stroke="#86a9a0"'))
svg(Path('world/machine.svg'),210,300,rect(23,43,162,245,'url(#armor)',18,'#132439',4)+rect(36,53,132,118,'#203e54',10)+ellipse(104,110,47,47,'url(#metal)',3)+ellipse(104,110,37,37,'#152d46',2)+''.join(path(f'M104 110 L{104+math.cos(i*math.tau/6)*29:.2f} {110+math.sin(i*math.tau/6)*29:.2f}','none',9,'stroke="#63949c"') for i in range(6))+rect(44,202,114,12,'url(#glass)',3)+''.join(rect(44,231+j*13,114,5,'#587487',2) for j in range(3))+path('M42  40 L40 9 69 9 69 40 M148 43 L150 5 176 5 176 44','none',12,'stroke="#537086"'))
svg(Path('world/lamp.svg'),110,200,path('M48 190 L50 40 Q50 15  80 19 L91 34','none',8,'stroke="#355268"')+path('M65 33 L103 33 96 65 74 65Z','url(#gold)',3)+ellipse(85,49,30, 30,'url(#glow)')+rect(76,37,18,22,'#ffefb8',3)+rect(33,185, 40,10,'url(#armor)',4))
svg(Path('world/portal.svg'),180,250,ellipse(90,131,76,110,'url(#glow)')+path('M34 231 L19 213 20 61 60 22 126 22 161  60 162 213 147 232 128 217 130  70 114 53 74 53 50 76 50 218Z','url(#metal)',4)+path('M36 214 L36 70 68 37 120 37 146 67 146 215','none',7,'stroke="#9cffe0"')+ellipse(90,136,39,78,'#246a76',2)+ellipse(90,136,30,66,'#55bfad')+path('M80 109 L108 134 81 164 81 145 68 145 68 126 80 126Z','#e2ffdf',0))
svg(Path('world/checkpoint.svg'),100,170,path('M15 157 L26 137 75 137 88 157 78 166 19 166Z','url(#armor)',2)+rect(42,58,16, 80,'url(#metal)',3)+path('M50 8 L81 42 50 76 19 42Z','url(#armor)',3)+path('M50 18 L71 42 50 65 29 42Z','url(#glass)',2)+path('M49 28 L40 45 50 43 46 57  60 39 50 41Z','#f5ffe6',0))
svg(Path('world/icon.svg'),128,128,rect(0,0,128,128,'#14273e',28)+path('M33 83 L40 36 52 16 60 44 76 22 88 20  80 59 105  70 99 97 71 110 40 100Z','url(#fur)',3)+path('M48 62 L89 57 88 77 56 81Z','url(#armor)',2)+path('M59 65 L83 62 79 72 60 74Z','url(#gold)',1))
# Large scenic skies and layered silhouettes. Each world has its own palette, forms and architecture.
palettes=[('#122e44','#398377','#f7c995','#99d7ad'),('#17334f','#547e96','#f3b384','#aedce1'),('#1b214b','#4d5582','#a4b6e2','#a8a5f3'),('#301f3c','#98524e','#ffb66d','#f5b073'),('#0c142e','#36366a','#8675b3','#dcb8fb')]
for n,(top,mid,light,mist) in enumerate(palettes):
 r=random.Random(812+n)
 b=f'<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="{top}"/><stop offset=".6" stop-color="{mid}"/><stop offset="1" stop-color="{light}"/></linearGradient><radialGradient id="sun"><stop stop-color="{light}" stop-opacity=".55"/><stop offset="1" stop-color="{light}" stop-opacity="0"/></radialGradient></defs>'
 b+=rect(0,0,1920,1080,'url(#sky)')+circle(1420,230,290,'url(#sun)')+circle(1420,230,62 if n!=4 else 112,light)
 if n==4:b+=circle(1460,196,102,top)
 for j in range(75 if n>1 else 15):
  x=r.randrange(1920);y=r.randrange(570);b+=circle(x,y,r.choice([1,1,1.5,2]),'#c7e9e7')
 for j in range(12):
  x=r.randrange(-100,1920);y=r.randrange(120,590);w=r.randrange(130,460)
  b+=f'<g opacity="{r.uniform(.04,.12):.3f}">'+ellipse(x,y,w,16+r.randrange(25),'#d6e9e6')+'</g>'
 for layer in range(3):
  y=590+layer*135;c=[mid,top,'#142c40'][layer]
  pts=f'M-100 1080 L-100 {y}'
  for x in range(-100,2021,100):pts+=f' L{x} {y-r.randrange(30,180)}'
  pts+=' L2020 1080Z';b+=f'<g opacity="{.35+layer*.12}">'+path(pts,c,0)+'</g>'
 svg(Path(f'world/sky_{n}.svg'),1920,1080,b)
 # Transparent parallax layer, tiled at 1920 world units.
 b=''
 for j in range(14):
  x=j*150+r.randint(-45,30);base=820;h=r.randint(160,440)
  if n==0:
   b+=path(f'M{x-12} {base} L{x+1} {base-h} {x+16} {base}Z','#133d48',0)
   for q in range(4):b+=canopy(x+r.randint(-24,24),base-h+q*45,125-q*8,58,'#194b51')
  elif n in [1,3]:
   b+=rect(x,base-h,65+r.randint(0,45),h,'#253d55',4)
   b+=rect(x-8,base-h-9,95,12,'#365b69',3)
   for yy in range(base-h+23,base-20,32):
    for xx in range(x+12,x+62,22):b+=rect(xx,yy,7,12,mist,1)
   if j%3==0:b+=path(f'M{x+20} {base-h} L{x+20} {base-h-100} {x+94} {base-h-100}','none',8,'stroke="#21364e"')
  elif n==2:
   b+=path(f'M{x} {base} L{x-30} {base-h+80} {x+12} {base-h} {x+52} {base-h+91} {x+69} {base}Z','#38395f',0)
   b+=path(f'M{x+12} {base-h} L{x+22} {base} {x+52} {base-h+91}Z','#4c507c',0)
  else:
   b+=path(f'M{x} {base} L{x} {base-h+65} {x+28} {base-h+65} {x+40} {base-h} {x+55} {base-h+65} {x+81} {base-h+65} {x+81} {base}Z','#282947',0)
   b+=rect(x+34,base-h+95,14,h-125,'#696094',7)
 svg(Path(f'world/horizon_{n}.svg'),1920,1080,b)
 # Repeatable terrain panel, top at y=0, natural material plus illuminated seam.
 colors=[('#5d9480','#274552','#182f43','#a8d39b'),('#af9170','#344d64','#203747','#f4d49c'),('#98b8dd','#475275','#26384f','#dcf5f2'),('#ba795d','#56383e','#2c293a','#ffc383'),('#8e86bb','#36344f','#222238','#e0b9ed')][n]
 cap,stone,deep,edge=colors
 b=rect(0,0,512,256,deep)+rect(0,14,512,242,stone)
 for row in range(4):
  for j in range(5):
   x=j*123-(60 if row%2 else 0); y=row*65+21
   b+=path(f'M{x+3} {y+5} L{x+111} {y} {x+119} {y+50} {x+5} {y+56}Z',stone,3)
   b+=path(f'M{x+8} {y+10} L{x+100} {y+7}','none',2,f'stroke="{cap}" opacity=".25"')
 b+=path('M0 0 L512 0 512 19 471 24 428 16 370 21 317 14 270 24 211 19 168 25 105 15 62 23 0 18Z',cap,0)+path('M0 2 L512 2','none',3,f'stroke="{edge}"')
 if n==0:
  for j in range(18):
   x=j*31;b+=path(f'M{x} 16 Q{x+14} 41 {x+7} 62','none',2,'stroke="#4d8c74"')
 if n==2:
  for j in range(13):x=j*42;b+=path(f'M{x} 18 L{x+7} {r.randrange(28,65)} {x+13} 18Z','#b2d9df',0)
 svg(Path(f'world/terrain_{n}.svg'),512,256,b)
# Landmark art gives each biome a recognizable place rather than a palette swap.
for n in range(5):
 b=''
 if n==0:
  for x,h in [(70,240),(500,330),(915,240)]:
   b+=rect(x,480-h,75,h,'#264c51',6)+rect(x-10,474-h,95,18,'#6b9a89',3)
  b+=path('M90 305 Q490 -80 955 305 L955 355 Q490 30 90 355Z','#426c65',3)
  for x in [250,267,284,301]: b+=rect(x,185,13,310,'#77d7cc',6)
  b+=path('M212 479 Q280 450 348 479','none',5,'stroke="#bfefd7"')
  for x in range(100,960,60):b+=path(f'M{x} 291 q-10 70 -28 84','none',3,'stroke="#4a8b71"')
 elif n==1:
  b+=path('M52 195 Q130 61 329 98 L410 148 382 176 109 230Z','#6b8998',3)
  b+=path('M74 196 L375 147 352 186 137 226Z','#b1b6a4',2)
  b+=path('M148 221 L184 282 284 267 332 187 M181 276 L178 245 M282 264 L290 224','none',6,'stroke="#456177"')
  for x in range(530,1000, 60):b+=rect(x,200+(x%160),40,300,'#344e65',3)
  b+=path('M476 273 Q700 391 996 190','none',4,'stroke="#d8bf92"')
 elif n==2:
  for j in range(14):
   x=70+j*69;h=150+(j*47)%260
   b+=path(f'M{x} 495 L{x-25} {495-h+45} {x+12} {495-h} {x+46} {495-h+64} {x+57} 495Z','#455782',2)
   b+=path(f'M{x+12} {495-h} L{x+7} 493 {x+46} {495-h+64}Z','#758ec0',0)
  b+=path('M138 456 Q474 80 931 456','none',14,'stroke="#a0b9ce"')
 elif n==3:
  for x in [100,365,660,900]:
   b+=rect(x,70,65,420,'#3f364a',7)+rect(x-13,70,91,22,'#8f756e',4)
   for y in range(140,440,55):b+=rect(x+13,y,39,22,'#cc7657',4)
  for x in [221,570,815]:
   b+=rect(x,262,29,238,'#db815b',4)+rect(x+10,262,5,238,'#ffd38d',2)
  b+=path('M68 125 L440 125 440 244 995 244','none',18,'stroke="#77636d"')
 else:
  b+=path('M250 496 L265 180 410 117 500 25 583 116 731 181 748 497 665 497 646 230 500 178 354 230 336 497Z','#3f3b62',3)
  b+=path('M286 483 L299 196 499  eighty 700 196 715 483'.replace('eighty','80'),'none',7,'stroke="#b1a0d2"')
  b+=ellipse(500,304,110,140,'#242847',4)+ellipse(500,304, 90,120,'#46436f',3)
  b+=path('M500 207 L547 296 500 379 452 296Z','#ae93cd',3)
 svg(Path(f'world/landmark_{n}.svg'),1080,500,b)
print('Built',len(list(ROOT.rglob('*.svg'))),'SVG assets')
