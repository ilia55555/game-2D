extends RefCounted
## Hand-authored critical paths, optional upper routes and encounters; no random levels.
const TITLES = ["VERDANT FRONTIER", "BRASS SKYWAYS", "PRISMATIC DEPTHS", "EMBER ENGINE", "THE ECLIPSE CITADEL"]
const SUBTITLES = ["Where the forest remembers", "Above a sea of clouds", "Something stirs beneath the ice", "Into the heart of the machine", "One last light against the dark"]
const BOSSES = ["MOSSBACK WARDEN", "ADMIRAL MANTA", "THE PRISM ORACLE", "FURNACE TITAN", "VARKON • ECLIPSE KING"]
const ART = ["warden", "manta", "oracle", "titan", "varkon"]
const ACCENTS = [Color("9ef0bd"), Color("ffcf8b"), Color("b8cbff"), Color("ffaa7c"), Color("d2adff")]

static func get_stage(index: int) -> Dictionary:
	var d = {"index": index, "title": TITLES[index], "subtitle": SUBTITLES[index], "boss_name": BOSSES[index], "boss_art": ART[index], "accent": ACCENTS[index], "floors": [], "platforms": [], "moving": [], "crumble": [], "spikes": [], "lasers": [], "springs": [], "enemies": [], "gems": [], "relics": [], "checkpoints": [], "signs": []}
	match index:
		0:
			d.length = 8800.0
			d.floors = [[0,620,1250],[1380,620,1280],[2800,620,1250],[4210,620,1300],[5680,620,1070],[6880,620,1920]]
			d.platforms = [[620,475,260],[1600,460,290],[2240,350,270],[3040,480,260],[3450,365,300],[4630,460,260],[5080,330,280],[5970,460,300],[6440,345,250],[7570,460,210],[8240,460,210]]
			d.moving = [[3970,510,220,150,0,3.4]]
			d.springs = [[2100,620],[4800,620]]
			d.spikes = [[1770,620,90],[3240,620,105],[6050,620,100]]
			d.relics = [[2360,300],[5200,280],[6550,295]]
			d.checkpoints = [[2900,620],[5740,620],[7130,620]]
			d.signs = [[310,"A / D  MOVE     SPACE  JUMP"],[870,"J  FIRE     SHIFT  DASH"],[1600,"JUMP AGAIN IN THE AIR"],[2250,"Q  SWITCH WEAPON   •   1 / 2 / 3"],[3520,"UPPER ROUTES HIDE CORE SHARDS"]]
		1:
			d.length = 9600.0
			d.floors = [[0,620,1150],[1300,580,1050],[2490,620,1010],[3710,560,1060],[4940,620,1040],[6140,570,1250],[7500,620,2100]]
			d.platforms = [[550,470,230],[1530,425,260],[1980,315,230],[2740,470,260],[3210,345,230],[3900,410,250],[4460,305,260],[5230,460,300],[6380,420,260],[6910,300,280],[8300,460,210],[9090,460,210]]
			d.moving = [[3410,495,240,180,0,3.0],[5750,450,220,160,75,4.0]]
			d.springs = [[1800,580],[6510,570]]
			d.spikes = [[2830,620,100],[5290,620,120]]
			d.lasers = [[4050,560,170,0.5],[6800,570,180,1.7]]
			d.relics = [[2100,265],[4580,255],[7040,250]]
			d.checkpoints = [[2550,620],[5020,620],[7740,620]]
			d.signs = [[390,"SKYWAYS   /   KEEP YOUR MOMENTUM"],[3210,"MOVING DECKS CARRY YOU"],[3790,"AMBER WARNS   •   RED HURTS"]]
		2:
			d.length = 10000.0
			d.floors = [[0,620,1300],[1440,620,1040],[2630,575,1070],[3860,620,1040],[5080,570,1200],[6450,620,1270],[7830,620,2170]]
			d.platforms = [[600,465,250],[1660,460,250],[2070,340,250],[2840,420,230],[3270,290,230],[4080,455,250],[4580,335,220],[5450,410,250],[5900,285,250],[6740,455,260],[7210,330,250],[8660,460,220],[9460,460,220]]
			d.crumble = [[2370,465,200],[3690,440,190],[4850,445,200],[6240,440,200]]
			d.springs = [[1780,620],[5640,570]]
			d.spikes = [[3050,575,100],[4230,620,120],[6970,620,130]]
			d.lasers = [[5540,570,180,.4],[7450,620,170,2.0]]
			d.relics = [[3380,240],[6030,235],[7310,280]]
			d.checkpoints = [[2720,575],[5180,570],[8120,620]]
			d.signs = [[370,"THE PRISM VAULTS"],[2230,"FRACTURED PLATFORMS REFORM"],[5350,"DASH THROUGH DANGER"]]
		3:
			d.length = 10600.0
			d.floors = [[0,620,1200],[1370,620,1190],[2730,570,1200],[4110,620,1150],[5440,560,1190],[6790,620,1250],[8190,620,2410]]
			d.platforms = [[650,460,250],[1590,465,250],[2140,330,250],[2930,415,250],[3480,295,230],[4370,465,250],[4850,330,250],[5690,400,250],[6210,280,250],[7060,455,250],[7590,320,250],[9250,460,220],[10070,460,220]]
			d.moving = [[3810,460,250,180,80,3.8],[6490,440,240,160,40,3.2]]
			d.springs = [[1860,620],[5860,560]]
			d.spikes = [[2290,620,120],[3040,570,120],[4590,620,120],[7330,620,130]]
			d.lasers = [[3590,570,185,0],[6000,560,180,1.6],[7810,620,180,.8]]
			d.relics = [[2250,280],[6330,230],[7710,270]]
			d.checkpoints = [[2830,570],[5520,560],[8670,620]]
			d.signs = [[390,"EMBER ENGINE   /   REACTOR ACCESS"],[4290,"NOVA SHOTS EXPLODE ON IMPACT"]]
		4:
			d.length = 11400.0
			d.floors = [[0,620,1250],[1420,580,1240],[2830,620,1280],[4290,565,1250],[5720,620,1360],[7240,570,1410],[8800,620,2600]]
			d.platforms = [[550,465,260],[1660,425,250],[2190,300,250],[3030,465,250],[3590,330,250],[4540,410,250],[5100,280,250],[6010,460,250],[6550,325,270],[7480,415,250],[8040,285,260],[10020,460,220],[10840,460,220]]
			d.moving = [[4010,450,240,180,60,3.4],[6970,450,230,160,80,3.6]]
			d.crumble = [[2630,450,200],[5540,445,220],[8610,450,220]]
			d.springs = [[1880,580],[7650,570]]
			d.spikes = [[2410,580,110],[3260,620,130],[6240,620,130],[8310,570,120]]
			d.lasers = [[3820,620,200,.3],[4870,565,190,1.3],[6720,620,190,2.3]]
			d.relics = [[2300,250],[5220,230],[8160,235]]
			d.checkpoints = [[2940,620],[5820,620],[9360,620]]
			d.signs = [[390,"THE ECLIPSE CITADEL"],[7440,"FIVE CORES. ONE LAST GUARDIAN."]]
	d.arena = d.length - 1400
	# Enemy placement is attached to each authored floor segment, safely away from gaps.
	var counter = 0
	for f in d.floors:
		var limit = minf(f[0] + f[2] - 160, d.arena - 200)
		var x = float(f[0] + 420)
		while x < limit:
			var kinds = ["crawler", "hopper", "turret", "sentinel"]
			var kind = kinds[(counter + index) % (3 if index == 0 else 4)]
			d.enemies.append([x, float(f[1]), kind])
			counter += 1
			x += 360 if index > 1 else 410
	for i in range(d.platforms.size() - 2):
		var p = d.platforms[i]
		if i % 3 != 1:
			d.enemies.append([float(p[0] + p[2]*.65), float(p[1]), "crawler" if index==0 else "turret"])
		if i % 3 == 1:
			d.enemies.append([float(p[0] + p[2]*.5), float(p[1]-95), "drone"])
		for k in range(3): d.gems.append([float(p[0]+45+k*55), float(p[1]- 40.0)])
	for f in d.floors:
		for x in range(int(f[0]+260),int(minf(f[0]+f[2]-100,d.arena-100)),140):
			d.gems.append([float(x),float(f[1]-55)])
	return d
