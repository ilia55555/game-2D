#!/usr/bin/env python3
"""Reproducible, strict export of authored Godot layouts (no Godot dependency)."""
import ast, json, pathlib, re
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=ROOT/'scripts/campaign.gd'
DEST=ROOT/'Unity/Assets/Velocity/Resources/Velocity/campaign.json'
def export():
    source=SOURCE.read_text()
    constants={}
    for key in ('TITLES','SUBTITLES','BOSSES','ART'):
        constants[key]=ast.literal_eval(re.search(r'^const '+key+r' = (.*)$',source,re.M)[1])
    accents=re.findall(r'Color\("([0-9a-f]+)"\)',re.search(r'^const ACCENTS.*$',source,re.M)[0])
    stages=[]
    keys=('floors','platforms','moving','crumble','spikes','lasers','springs','relics','checkpoints','signs')
    for index in range(5):
        block=re.search(r'\n\t\t'+str(index)+r':\n(.*?)(?=\n\t\t\d:|\n\td.arena)',source,re.S)[1]
        stage={'index':index,'title':constants['TITLES'][index],'subtitle':constants['SUBTITLES'][index],
               'bossName':constants['BOSSES'][index],'bossArt':constants['ART'][index],'accent':'#'+accents[index],
               'length':float(re.search(r'd.length = ([\d.]+)',block)[1])}
        raw={}
        for key in keys:
            match=re.search(r'd\.'+key+r' = (.*)',block)
            raw[key]=ast.literal_eval(match[1]) if match else []
            stage[key]=[{'values':v} for v in raw[key]] if key!='signs' else [{'x':x,'text':t} for x,t in raw[key]]
        stage['arena']=stage['length']-1400
        enemies=[]; gems=[]; counter=0
        for x,y,w in raw['floors']:
            at=x+420; limit=min(x+w-160,stage['arena']-200)
            while at<limit:
                kind=['crawler','hopper','turret','sentinel'][(counter+index)%(3 if index==0 else 4)]
                enemies.append({'x':at,'y':y,'kind':kind});counter+=1;at+=360 if index>1 else 410
        for i,(x,y,w) in enumerate(raw['platforms'][:-2]):
            if i%3!=1: enemies.append({'x':x+w*.65,'y':y,'kind':'crawler' if index==0 else 'turret'})
            else: enemies.append({'x':x+w*.5,'y':y-95,'kind':'drone'})
            gems.extend({'values':[x+45+k*55,y-40]} for k in range(3))
        for x,y,w in raw['floors']:
            gems.extend({'values':[v,y-55]} for v in range(int(x+260),int(min(x+w-100,stage['arena']-100)),140))
        stage.update(enemies=enemies,gems=gems);stages.append(stage)
    return {'version':1,'pixelsPerUnit':100,'stages':stages}
if __name__=='__main__':
    DEST.parent.mkdir(parents=True,exist_ok=True)
    DEST.write_text(json.dumps(export(),ensure_ascii=False,indent=2)+'\n')
    print('Exported five authored stages to',DEST)
