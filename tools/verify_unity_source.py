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
assert data['version'] == 2 and len(data['stages']) == 6
catalog = (UNITY / 'Assets/Velocity/Resources/Velocity/Models.asset').read_text()
ids = re.findall(r'^  - id: (.+)$', catalog, re.M)
assert len(ids) == len(set(ids)), 'Duplicate model IDs'
models = set(ids)
assert all(f'layout_{i}' in models and f'environment_{i}' in models for i in range(6))
motor = (UNITY / 'Assets/Velocity/Scripts/PlayerMotor.cs').read_text()
speed, jump, gravity = (float(re.search(r'\b' + key + r' = ([\d.]+)', motor)[1]) for key in ('Speed', 'JumpSpeed', 'Gravity'))
for s in data['stages']:
    assert s['index'] < 6 and s['bossArt'] in models and s['bossHealth'] > 0
    assert s['length'] - s['arena'] == 2000 and len(s['checkpoints']) == len(s['relics']) == 3
    assert s['friction'] > 0 and s['spawn']['z'] == 0
    floors = sorted([r['values'] for r in s['floors']])
    def safe_ground(x, y):
        return any(fx + 20 <= x and x + 70 < fx + width and y == fy for fx, fy, width in floors)
    for c in s['checkpoints']:
        x, y = c['values']
        assert safe_ground(x, y), f"Unsafe checkpoint: {s['title']} {x, y}"
        assert not any(h['values'][0] - 20 < x + 55 < h['values'][0] + h['values'][2] + 20 for h in s['spikes'])
    # Necessary geometric reachability condition using the motor's actual constants.
    # This is deliberately labelled an envelope check, not a simulated playthrough.
    for (x, y, width), (nx, ny, _) in zip(floors, floors[1:]):
        rise = (y - ny) / 100
        discriminant = jump * jump - 2 * gravity * rise
        assert discriminant >= 0, f"Unreachable rise in {s['title']}"
        descending_time = (jump + math.sqrt(discriminant)) / gravity
        assert (nx - x - width) / 100 + .5 < speed * descending_time, f"Unreachable pit in {s['title']}"
    for enemy in s['enemies']:
        assert enemy['kind'] in models and 0 < enemy['x'] < s['arena']
    for key in ('floors', 'platforms', 'moving', 'crumble', 'spikes', 'lasers', 'springs', 'relics', 'checkpoints', 'gems'):
        for row in s[key]:
            assert all(math.isfinite(v) for v in row['values'])
            assert 0 <= row['values'][0] < s['length']
    for relic in s['relics']:
        x, y = relic['values']
        assert any(r['values'][0] <= x <= r['values'][0] + r['values'][2] and 0 < r['values'][1] - y <= 80
                   for r in s['platforms'] + s['crumble']), 'Relic lacks a supporting upper route'
    print(s['title'], len(s['enemies']), 'enemies;', len(s['gems']), 'coins; checkpoint and jump envelopes valid')
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
