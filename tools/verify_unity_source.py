#!/usr/bin/env python3
"""Check authored content, jump envelopes, GUID links and C# syntax (not Unity compilation)."""
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import sys

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[1]
UNITY = ROOT / 'Unity'
parser = argparse.ArgumentParser()
parser.add_argument('--require-audio', action='store_true')
args = parser.parse_args()
spec = importlib.util.spec_from_file_location('aero_campaign', ROOT / 'tools/build_aero_campaign.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
data = json.loads((UNITY / 'Assets/Velocity/Resources/Velocity/campaign.json').read_text())
assert data == builder.build(), 'Campaign and authored source differ; regenerate with tools/build_aero_campaign.py'
assert data['version'] == 3 and len(data['stages']) == 6
catalog = (UNITY / 'Assets/Velocity/Resources/Velocity/Models.asset').read_text()
ids = re.findall(r'^  - id: (.+)$', catalog, re.M)
assert len(ids) == len(set(ids)), 'Duplicate model IDs'
models = set(ids)
assert all(f'layout_{i}' in models and f'environment_{i}' in models for i in range(6))
motor = (UNITY / 'Assets/Velocity/Scripts/PlayerMotor.cs').read_text()
speed, jump, gravity = (float(re.search(r'\b' + key + r' = ([\d.]+)', motor)[1]) for key in ('Speed', 'JumpSpeed', 'Gravity'))
previous_health = 0
previous_length = 0
for s in data['stages']:
    assert s['index'] < 6 and s['bossArt'] in models and s['bossHealth'] > previous_health
    assert s['length'] > previous_length and s['length'] - s['arena'] == 2400
    assert s['length'] >= 40000 and len(s['checkpoints']) >= 5 and len(s['relics']) == 3
    previous_health, previous_length = s['bossHealth'], s['length']
    assert s['reactiveArena'] and 'terrain_arena' in models
    assert s['friction'] > 0 and s['spawn']['z'] == 0
    floors = sorted([r['values'] for r in s['floors']])
    def safe_ground(x, y):
        return any(fx + 20 <= x and x + 70 < fx + width and abs(y - fy) < .01 for fx, fy, width in floors)
    for c in s['checkpoints']:
        x, y = c['values']
        assert safe_ground(x, y), f"Unsafe checkpoint: {s['title']} {x, y}"
        assert not any(abs(h['values'][1]-y) < 1 and h['values'][0] - 20 < x + 55 < h['values'][0] + h['values'][2] + 20 for h in s['spikes'])
        assert any(q['start']*100 <= x < q['end']*100 and q['pressure'] == 0 for q in s['sections'])
        assert not any(abs(e['x']-x) < 250 for e in s['enemies']), 'Enemy on checkpoint'
    # Match the proof to actual colliders, then use the motor's physical envelope.
    # Include BOTH endpoints' maximum movement, a landing margin and acceleration
    # headroom. This is a necessary geometry check, not proof of a playable build.
    route = [r['values'] for r in s['route']]
    for r in route:
        kind = ('floors', 'platforms', 'moving', 'crumble')[int(r[3])]
        assert any(actual['values'][:3] == r[:3] for actual in s[kind]), 'Stale route proof'
    def motion(r):
        if r[3] != 2:
            return 0, 0
        actual = next(a['values'] for a in s['moving'] if a['values'][:3] == r[:3])
        return abs(actual[3])/100, abs(actual[4])/100
    def jump_fits(r, nxt):
        dx, dy = motion(r)
        ndx, ndy = motion(nxt)
        rise = (r[1]-nxt[1])/100 + dy + ndy
        discriminant = jump * jump - 2 * gravity * rise
        assert discriminant >= 0, f"Unreachable rise in {s['title']} at {nxt[0]/100}m"
        descending_time = (jump + math.sqrt(discriminant))/gravity
        distance = max(0, (nxt[0]-r[0]-r[2])/100 + dx + ndx) + .6
        assert distance < speed * .85 * descending_time, f"Unreachable pit in {s['title']} at {nxt[0]/100}m"
    for r, nxt in zip(route, route[1:]):
        jump_fits(r, nxt)
    heights = [(620-r[1])/100 for r in route]
    assert min(heights) <= -7 and max(heights) >= 8 and max(heights)-min(heights) >= 15
    assert s['killY'] <= min(heights)-5
    assert s['cameraMinY'] <= min(heights)+1.9 and s['cameraMaxY'] >= max(heights)+4
    assert sum(r[3] != 0 for r in route) >= 6, 'No mandatory bridge crossings'
    for enemy in s['enemies']:
        assert enemy['kind'] in models and 0 < enemy['x'] < s['arena']
        assert 1 <= enemy['pressure'] <= 3
        section = next(q for q in s['sections'] if q['start'] <= enemy['x']/100 < q['end'])
        assert section['pressure'] > 0, 'Enemy occupies a quiet stretch'
        assert enemy['territory'] == -1 or any(t['id'] == enemy['territory'] for t in s['territories'])
    for key in ('floors', 'platforms', 'moving', 'crumble', 'spikes', 'lasers', 'springs', 'relics', 'checkpoints', 'gems'):
        for r in s[key]:
            assert all(math.isfinite(v) for v in r['values'])
            assert 0 <= r['values'][0] < s['length']
    # Optional shelves must also be reachable from some preceding surface.
    for relic in s['relics']:
        x, y = relic['values']
        support = next((r['values'] for r in s['platforms'] if r['values'][0] <= x <= r['values'][0]+r['values'][2] and 0 < r['values'][1]-y <= 80), None)
        assert support, 'Relic lacks a supporting upper route'
        reachable = [r for r in route if r[0] < support[0]]
        optional = sorted([r['values']+[1] for r in s['platforms'] if r['values'][0] <= support[0]])
        for upper in optional:
            if any(abs(upper[0]-r[0]) < 450 and 0 <= (r[1]-upper[1])/100 <= 1.3 and upper[0] <= r[0]+r[2]+180 for r in reachable):
                reachable.append(upper)
        assert any(r[:3] == support[:3] for r in reachable), 'Disconnected core path'
    assert len(s['territories']) >= 2
    for t in s['territories']:
        guards = [e for e in s['enemies'] if e['territory'] == t['id']]
        assert len(guards) == 2 and all(t['start'] <= e['x']/100 <= t['end'] for e in guards)
        assert any(fx/100 <= t['start'] and (fx+w)/100 >= t['end'] and abs((620-fy)/100-t['y']) < .01 for fx, fy, w in floors)
    sections = s['sections']
    assert {q['pressure'] for q in sections} == {0, 1, 2, 3}
    assert sections[0]['start'] == 0 and sections[-1]['end'] == s['arena']/100
    assert all(a['end'] == b['start'] for a,b in zip(sections,sections[1:]))
    # A full quiet section separates major combat peaks.
    assert all(q['pressure'] == 0 for q in sections if q['pattern'] == 'rest')
    print(s['title'], s['length']/100, 'm;', len(s['enemies']), 'enemies;', len(s['gems']), 'coins; route envelopes valid')
assert data['stages'][-1]['finalBossArt'] == 'vexar_feral'
assert {'vexar_feral', 'vexar_armored', 'vexar_final'}.issubset(models)
for family in ('pulse', 'scatter', 'laser', 'rocket', 'ice', 'plasma'):
    assert 'player_' + family in models

guids = {}
for p in (UNITY / 'Assets').rglob('*.meta'):
    match = re.search(r'^guid: (\w+)', p.read_text(), re.M)
    assert match, f'Missing GUID: {p}'
    guid = match[1]
    assert guid not in guids, f'Duplicate GUID: {p}'
    guids[guid] = p
for p in (UNITY / 'Assets').rglob('*'):
    if p.is_file() and p.suffix != '.meta':
        assert Path(str(p) + '.meta').exists(), f'Missing metadata: {p}'
for p in list((UNITY / 'Assets').rglob('*.unity')) + list((UNITY / 'Assets').rglob('*.asset')):
    for guid in re.findall(r'guid: ([0-9a-f]{32})', p.read_text()):
        assert guid in guids, f'Dangling Unity reference: {p} {guid}'
for p in UNITY.rglob('*.asmdef'):
    json.loads(p.read_text())
manifest = json.loads((UNITY / 'Packages/manifest.json').read_text())
assert 'com.unity.ai.assistant' not in manifest['dependencies'] and 'com.unity.ide.rider' not in manifest['dependencies']
audio = json.loads((ROOT / 'tools/unity_audio_manifest.json').read_text())
for entry in audio:
    asset = ROOT / entry['path']
    assert Path(str(asset) + '.meta').exists()
    if args.require_audio:
        assert asset.exists(), f'Missing audio: {asset}'
    if asset.exists():
        raw = asset.read_bytes()
        assert hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest() == entry['sha']

try:
    import tree_sitter
    import tree_sitter_c_sharp
except ImportError:
    raise SystemExit('Install tree-sitter and tree-sitter-c-sharp to run the required syntax check')
syntax = tree_sitter.Parser(tree_sitter.Language(tree_sitter_c_sharp.language()))
files = list((UNITY / 'Assets').rglob('*.cs'))
errors = [str(p) for p in files if syntax.parse(p.read_bytes()).root_node.has_error]
assert not errors, 'C# syntax errors: ' + str(errors)
print(f'PASS: content, jump envelopes, GUIDs, audio references and syntax of {len(files)} C# files.')
print('Unity compilation, Animator evaluation and PlayMode execution still require the Unity Editor.')
