#!/usr/bin/env python3
"""Author the six AERO blockout routes. Units are legacy pixels (100 = one metre).

This intentionally does not overwrite the archived Godot campaign. Change this
source to regenerate the shipped JSON, or edit a separate scene/prefab in Unity.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'Unity/Assets/Velocity/Resources/Velocity/campaign.json'
BIOMES = [
    ('Verdant Jungle', 'Canopy bridges and hidden ruins', 'jungle', '#41D69A', 'KING KONA', 'boss_gorilla', 72),
    ('Scorching Desert', 'Sandstone towers and scorpion nests', 'desert', '#F6B94C', 'SCORPION KING', 'boss_scorpion', 88),
    ('Storm Mountains', 'High routes above the clouds', 'mountain', '#76C9F4', 'SKY TALON', 'boss_eagle', 96),
    ('Frozen Kingdom', 'Slippery ledges and ice caverns', 'ice', '#75E4F3', 'FROSTFANG', 'boss_bear', 108),
    ('Volcanic Depths', 'Crumbling rock above molten lava', 'volcano', '#FF6545', 'INFERNO LION', 'boss_lion', 120),
    ('Iron Citadel', 'Factories at the edge of Vexar\'s domain', 'industrial', '#AE86FF', 'IRONHORN', 'boss_rhino', 132),
]

def row(*values):
    return {'values': list(values)}

def build():
    stages = []
    for index, (title, subtitle, biome, accent, boss, art, health) in enumerate(BIOMES):
        cells = 7 + index
        arena = cells * 1200
        length = arena + 2000
        s = dict(index=index, title=title, subtitle=subtitle, biome=biome,
                 accent=accent, bossName=boss, bossArt=art, bossHealth=health,
                 finalBossName='VEXAR' if index == 5 else '',
                 finalBossArt='vexar_feral' if index == 5 else '',
                 music='stage_' + str(min(index, 4)), friction=.42 if index == 3 else 1,
                 spawn=dict(x=1.7, y=.02, z=0), bossSpawn=dict(x=(length-650)/100, y=0, z=0), customBossSpawn=False,
                 length=length, arena=arena)
        for key in ('floors', 'platforms', 'moving', 'crumble', 'spikes', 'lasers',
                    'springs', 'relics', 'checkpoints', 'gems', 'enemies', 'signs'):
            s[key] = []
        checkpoint_cells = [1, cells // 2, cells - 1]
        heights = [0, 60, 120, 180, 100, 0] if index == 2 else [0, 0, 40, 0]
        for c in range(cells):
            x = c * 1200
            h = heights[c % len(heights)]
            if c in (0, cells - 1):
                h = 0
            y = 620 - h
            width = 960 - index * 12
            s['floors'].append(row(x, y, width))
            # A high optional route rises in 1.2m steps, then descends to the next cell.
            for step, (dx, rise, w) in enumerate(((190, 110, 220), (430, 230, 220), (680, 350, 220))):
                dest = 'crumble' if c % 3 == 2 and step == 2 else 'platforms'
                s[dest].append(row(x + dx, y - rise, w))
                for gx in range(x + dx + 45, x + dx + w, 70):
                    s['gems'].append(row(gx, y - rise - 45))
            s['moving'].append(row(x + 955, y - 190, 180, 45, 55, 3.6 + index * .2))
            for gx in range(x + 130, x + width - 100, 140):
                s['gems'].append(row(gx, y - 35))
            if c in checkpoint_cells:
                s['checkpoints'].append(row(x + 90, y))
                s['relics'].append(row(x + 790, y - 400))
            if c % 2 == 0:
                s['springs'].append(row(x + 285, y))
            if c > 0:
                s['spikes'].append(row(x + 530, y, 100 + index * 8))
            if index >= 4 and c % 2:
                s['lasers'].append(row(x + 730, y, 180, c * .45))
            # First 4m are safe; ground guards and fliers teach separate combat lanes.
            ground_kinds = ['mushroom', 'scorpion', 'wolf', 'ice_wolf', 'fire_imp', 'robot']
            flying_kinds = ['bee', 'vulture', 'drone', 'ice_drone', 'fire_bat', 'drone']
            s['enemies'].append(dict(x=x + 660, y=y, kind=ground_kinds[index]))
            s['enemies'].append(dict(x=x + 740, y=y - 270, kind=flying_kinds[index]))
            if c % 2:
                s['enemies'].append(dict(x=x + 880, y=y, kind='turret' if index == 5 else ground_kinds[index]))
        s['floors'].append(row(arena, 620, 2000))
        s['signs'] = [
            dict(x=180, text='A / D move | Space double jump | Shift dash | J or click fire'),
            dict(x=500, text='Q / E cycles six weapons | 1-6 selects | Hold laser to charge, release to fire'),
            dict(x=1290, text='Checkpoint: health and energy restored. Blue upper paths hide three core shards.'),
            dict(x=arena - 300, text='Boss arena ahead. Watch the warning, dodge, then attack during recovery.'),
        ]
        if index == 3:
            s['signs'].append(dict(x=2450, text='Ice has less grip: brake early or dash to change direction.'))
        stages.append(s)
    return dict(version=2, pixelsPerUnit=100, stages=stages)

if __name__ == '__main__':
    OUTPUT.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + '\n')
    print('Wrote six AERO stages to', OUTPUT)
