#!/usr/bin/env python3
"""Source validation only. This does not replace Unity compilation or PlayMode tests."""
import hashlib,importlib.util,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[1]
UNITY=ROOT/'Unity'
spec=importlib.util.spec_from_file_location('exporter',ROOT/'tools/export_unity_campaign.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
data=json.loads((UNITY/'Assets/Velocity/Resources/Velocity/campaign.json').read_text())
assert data==mod.export(), 'Campaign differs from authored Godot source'
for s in data['stages']:
 assert s['arena']==s['length']-1400 and len(s['checkpoints'])==len(s['relics'])==3
 for row in s['checkpoints']:
  x,y=row['values'];assert any(f['values'][0]<=x and x+55<f['values'][0]+f['values'][2] and y==f['values'][1] for f in s['floors'])
 print(s['title'],len(s['enemies']),'enemies',len(s['gems']),'gems')
guids={}
for p in (UNITY/'Assets').rglob('*.meta'):
 g=re.search(r'^guid: (\w+)',p.read_text(),re.M)[1];assert g not in guids, f'duplicate GUID: {p}';guids[g]=p
for p in (UNITY/'Assets').rglob('*'):
 if p.is_file() and p.suffix!='.meta': assert pathlib.Path(str(p)+'.meta').exists(),f'Missing metadata {p}'
for p in list((UNITY/'Assets').rglob('*.unity'))+list((UNITY/'Assets').rglob('*.asset')):
 for g in re.findall(r'guid: ([0-9a-f]{32})',p.read_text()): assert g in guids, f'Dangling Unity reference: {p} {g}'
for p in UNITY.rglob('*.asmdef'): json.loads(p.read_text())
json.loads((UNITY/'Packages/manifest.json').read_text())
audio=json.loads((ROOT/'tools/unity_audio_manifest.json').read_text())
assert len(audio)==19 and len({a['sha'] for a in audio})==19
for entry in audio: assert (ROOT/(entry['path']+'.meta')).exists()
# Optional parser: pip install tree-sitter tree-sitter-c-sharp
try:
 import tree_sitter,tree_sitter_c_sharp
except ImportError:
 print('C# syntax parser unavailable; NOT a compilation result')
else:
 parser=tree_sitter.Parser(tree_sitter.Language(tree_sitter_c_sharp.language()))
 errors=[]
 for p in (UNITY/'Assets').rglob('*.cs'):
  tree=parser.parse(p.read_bytes())
  if tree.root_node.has_error: errors.append(str(p))
 assert not errors, 'C# syntax errors: '+str(errors)
 print('C# syntax parsed:',len(list((UNITY/'Assets').rglob('*.cs'))),'files; Unity type checking NOT run')
print('PASS: campaign parity, checkpoints, JSON, GUID links and audio references')
