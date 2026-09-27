#!/usr/bin/env python3
"""Deterministic long AERO routes. Old rows use 100 pixels/metre, +Y down.

Sections/territories use metres. route records mandatory stepping surfaces for
an independent jump-envelope check, not a simulated playthrough.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'Unity/Assets/Velocity/Resources/Velocity/campaign.json'
BIOMES = [
    ('Verdant Jungle', 'Canopy bridges and occupied ruins', 'jungle', '#41D69A', 'KING KONA', 'boss_gorilla', 70),
    ('Scorching Desert', 'Sandstone towers and deep canyons', 'desert', '#F6B94C', 'SCORPION KING', 'boss_scorpion', 100),
    ('Storm Mountains', 'Broken ridges above the clouds', 'mountain', '#76C9F4', 'SKY TALON', 'boss_eagle', 132),
    ('Frozen Kingdom', 'Frozen ravines and shifting ice', 'ice', '#75E4F3', 'FROSTFANG', 'boss_bear', 164),
    ('Volcanic Depths', 'Contested bridges over molten rock', 'volcano', '#FF6545', 'INFERNO LION', 'boss_lion', 196),
    ('Iron Citadel', "A siege at the edge of Vexar's domain", 'industrial', '#AE86FF', 'IRONHORN', 'boss_rhino', 230),
]
# name, length, destination height, local pressure (0 = quiet), pattern
ROOMS = [
    ('Arrival', 24, 0, 0, 'rest'),
    ('Foothill climb', 32, 5, 1, 'steps'),
    ('First overlook', 14, 5, 0, 'rest'),
    ('Valley descent', 28, -4, 1, 'steps'),
    ('Broken crossing', 24, -4, 2, 'bridge'),
    ('Occupied outpost', 24, -4, 2, 'territory'),
    ('Valley shelter', 14, -4, 0, 'rest'),
    ('High ascent', 38, 8, 1, 'steps'),
    ('Exposed ridge', 28, 8, 3, 'bridge'),
    ('Summit shelter', 14, 8, 0, 'rest'),
    ('Deep descent', 30, -7, 2, 'steps'),
    ('Enemy stronghold', 26, -7, 3, 'territory'),
    ('Canyon shelter', 14, -7, 0, 'rest'),
    ('Escape climb', 38, 2, 2, 'steps'),
    ('Last gauntlet', 26, 2, 3, 'steps'),
    ('Guardian approach', 20, 0, 0, 'steps'),
]

def row(*values):
    return {'values': [round(v, 3) for v in values]}

def surface(x, y, width, *extra):
    return row(x * 100, 620 - y * 100, width * 100, *extra) if width else row(x * 100, 620 - y * 100)

def build():
    stages = []
    for index, (title, subtitle, biome, accent, boss, art, health) in enumerate(BIOMES):
        s = dict(index=index, title=title, subtitle=subtitle, biome=biome,
                 accent=accent, bossName=boss, bossArt=art, bossHealth=health,
                 finalBossName='VEXAR' if index == 5 else '', finalBossArt='vexar_feral' if index == 5 else '',
                 music='stage_' + str(min(index, 4)), friction=.42 if index == 3 else 1,
                 spawn=dict(x=1.7, y=.02, z=0), customBossSpawn=False, reactiveArena=True)
        for key in ('floors', 'platforms', 'moving', 'crumble', 'spikes', 'lasers', 'springs',
                    'relics', 'checkpoints', 'gems', 'enemies', 'signs', 'sections', 'territories', 'route'):
            s[key] = []
        rooms = list(ROOMS)
        if index == 5:
            rooms[-1:-1] = [('Reactor ascent', 24, 10, 3, 'steps'), ('Reactor descent', 24, 2, 2, 'steps')]
        scale = 1 + index * .1
        ground_kind = ['mushroom', 'scorpion', 'wolf', 'ice_wolf', 'fire_imp', 'robot'][index]
        flyer_kind = ['bee', 'vulture', 'drone', 'ice_drone', 'fire_bat', 'drone'][index]
        x, height = 0., 0.

        def add_enemy(ex, ey, kind, pressure, territory=-1):
            s['enemies'].append(dict(x=round(ex*100, 3), y=round(620-ey*100, 3),
                                     kind=kind, pressure=pressure, territory=territory))

        for room_no, (name, size, target, pressure, pattern) in enumerate(rooms):
            size = round(size * scale, 3)
            end = round(x + size, 3)
            target = target + index * (1.2 if target > 0 else -.7 if target < 0 else 0)
            s['sections'].append(dict(title=name, pattern=pattern, start=x, end=end,
                                      y=round(target, 3), pressure=pressure))
            local = []
            if pattern in ('rest', 'territory'):
                local.append((x, target, size, 'floors'))
            else:
                count = math.ceil(max(size / 4.8, abs(target-height) / .95)) + 1
                stride = size / count
                for n in range(count):
                    y = height + (target-height) * n / (count-1)
                    kind = 'floors'
                    gap = min(1.15 if pressure else .55, stride * .22)
                    if pattern == 'bridge' and 0 < n < count-1:
                        kind = 'moving' if n % 3 == 1 else 'crumble' if pressure == 3 and n % 3 == 2 else 'platforms'
                        gap = min(2., stride * .42)
                    # Last slab reaches the next room, without a disconnected border.
                    local.append((x+n*stride, y, stride-(gap if n < count-1 else 0), kind))
            for sx, sy, width, kind in local:
                extra = (18, 18, 4.8) if kind == 'moving' else ()
                r = surface(sx, sy, width, *extra)
                s[kind].append(r)
                s['route'].append(row(*r['values'][:3], ('floors', 'platforms', 'moving', 'crumble').index(kind)))
                for gx in range(math.ceil((sx+.8)*10), math.floor((sx+width-.4)*10), 18):
                    s['gems'].append(surface(gx/10, sy+.42, 0))
            if pressure == 0 and room_no > 0:
                fx, fy, fw, _ = local[-1] if pattern == 'steps' else local[0]
                s['checkpoints'].append(surface(fx+.45 if pattern == 'steps' else fx+2, fy, 0))
            if room_no in (1, 7, 13):
                # Three optional ascending shelves per core, distinct from the main path.
                fx, fy, fw, _ = local[len(local)//2]
                for n in range(3):
                    px, py = fx+n*1.35, fy+1.15*(n+1)
                    s['platforms'].append(surface(px, py, 2.1))
                    s['gems'].append(surface(px+.6, py+.45, 0))
                s['relics'].append(surface(px+1, py+.48, 0))
                s['springs'].append(surface(fx+.35, fy, 0))
            if pattern == 'territory':
                tid = len(s['territories'])
                s['territories'].append(dict(id=tid, start=x+1, end=end-1, y=target, pressure=pressure))
                for ex in (x+size*.29, x+size*.72):
                    add_enemy(ex, target, 'turret', pressure, tid)
                add_enemy(x+size*.52, target+2.6, flyer_kind, pressure)
            elif pressure:
                candidates = local[1:-1] or local
                for n in range(pressure):
                    fx, fy, fw, kind = candidates[min(len(candidates)-1, (n+1)*len(candidates)//(pressure+1))]
                    if kind == 'floors':
                        add_enemy(fx+fw*.6, fy, ground_kind, pressure)
                fx, fy, fw, _ = local[len(local)//2]
                add_enemy(fx+fw*.5, fy+2.5, flyer_kind, pressure)
                if pressure >= 2 and pattern == 'steps' and fw > 2:
                    s['spikes'].append(surface(fx+.25, fy, .8+index*.05))
                if pressure == 3 and index >= 3 and pattern == 'steps':
                    fx, fy, fw, _ = local[-2]
                    s['lasers'].append(surface(fx+fw*.7, fy, 1.8, room_no*.43))
            height, x = target, end
        arena, length = x, x+24
        s.update(length=round(length*100, 3), arena=round(arena*100, 3),
                 bossSpawn=dict(x=length-6.5, y=0, z=0))
        arena_floor = surface(arena, 0, 24)
        s['floors'].append(arena_floor)
        s['route'].append(row(*arena_floor['values'], 0))
        low = min((620-r['values'][1])/100 for r in s['route'])
        high = max((620-r['values'][1])/100 for r in s['route'])
        s.update(killY=round(low-6, 3), cameraMinY=round(low+1.4, 3), cameraMaxY=round(high+5.5, 3))
        s['signs'] = [
            dict(x=180, text='A / D move | Space double jump | Shift dash | J or click fire'),
            dict(x=750, text='Q / E cycles six weapons | 1-6 selects | Hold laser to charge, release to fire'),
            dict(x=s['checkpoints'][0]['values'][0], text='Shelter: health and energy restored. Three core shards hide on upper paths.'),
            dict(x=s['territories'][0]['start']*100, text='ENEMY CONTROL: defeat both operators to stop the floor traps and settle the lifts.'),
            dict(x=(arena-3)*100, text='Guardian ahead. Yellow marks show changing ground. Use the raised escape ledges.'),
        ]
        if index == 3:
            s['signs'].append(dict(x=2600, text='Ice has less grip: brake early before the descent.'))
        stages.append(s)
    return dict(version=3, pixelsPerUnit=100, stages=stages)

if __name__ == '__main__':
    OUTPUT.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + '\n')
    for s in build()['stages']:
        print(s['title'], s['length']/100, 'metres;', len(s['checkpoints']), 'checkpoints')
