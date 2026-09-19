extends Node2D
const Campaign = preload("res://scripts/campaign.gd")
const Player = preload("res://scripts/player.gd")
const Enemy = preload("res://scripts/enemy.gd")
const Boss = preload("res://scripts/boss.gd")
const Terrain = preload("res://scripts/terrain.gd")
const Backdrop = preload("res://scripts/backdrop.gd")
const Pickup = preload("res://scripts/pickup.gd")
const Mechanism = preload("res://scripts/mechanism.gd")
const Projectile = preload("res://scripts/projectile.gd")
const ShotEffect = preload("res://scripts/shot_effect.gd")
const Sheet16 = preload("res://scripts/sprite_sheet_16.gd")
const Effects = preload("res://scripts/effects.gd")
var index: int = 0
var definition: Dictionary
var length: float
var player
var boss
var camera: Camera2D
var fx
var score: int = 0
var gems: int = 0
var relics: int = 0
var kills: int = 0
var elapsed: float = 0
var deaths: int = 0
var checkpoint: Vector2 = Vector2(170,618)
var checkpoint_id: int = -1
var boss_started: bool = false
var boss_defeated: bool = false
var completed: bool = false
var respawning: bool = false
var arena_gate: StaticBody2D
var camera_shake: float = 0
var banner_timer: float = 0
var banner_title: String = ""
var banner_subtitle: String = ""
var touch: Dictionary = {}
var shot_serial: int = 0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_PAUSABLE
	definition = Campaign.get_stage(index)
	length = definition.length
	var layer = CanvasLayer.new()
	layer.layer = -10
	add_child(layer)
	var background = Backdrop.new()
	background.biome = index
	background.world = self
	layer.add_child(background)
	for f in definition.floors: add_terrain(Vector2(f[0],f[1]),Vector2(f[2],1000-f[1]))
	for f in definition.platforms: add_terrain(Vector2(f[0],f[1]),Vector2(f[2],42))
	for f in definition.moving:
		var platform = add_terrain(Vector2(f[0],f[1]),Vector2(f[2],40))
		platform.moving = Vector2(f[3],f[4])
		platform.period = f[5]
	for f in definition.crumble:
		var platform = add_terrain(Vector2(f[0],f[1]),Vector2(f[2],38))
		platform.crumble = true
	build_decoration()
	for p in definition.gems: spawn_pickup(Vector2(p[0],p[1]),"gem")
	for p in definition.relics: spawn_pickup(Vector2(p[0],p[1]),"relic")
	for f in definition.spikes:
		var m = mechanism("spike",Vector2(f[0],f[1]))
		m.width = f[2]
	for f in definition.lasers:
		var m = mechanism("laser",Vector2(f[0],f[1]))
		m.height = f[2]
		m.phase = f[3]
	for f in definition.springs: mechanism("spring",Vector2(f[0],f[1]))
	for j in range(definition.checkpoints.size()):
		var f = definition.checkpoints[j]
		var m = mechanism("checkpoint",Vector2(f[0],f[1]))
		m.checkpoint_index = j
	mechanism("portal",Vector2(length-130,620))
	for spec in definition.enemies:
		var enemy = Enemy.new()
		enemy.world = self
		enemy.position = Vector2(spec[0],spec[1])
		enemy.kind = spec[2]
		add_child(enemy)
	fx = Effects.new()
	add_child(fx)
	spawn_player()
	spawn_boss()
	camera = Camera2D.new()
	camera.position = Vector2(640,360)
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 6
	camera.limit_left = 0
	camera.limit_right = int(length)
	camera.limit_top = -160
	camera.limit_bottom = 800
	camera.limit_smoothed = true
	add_child(camera)
	camera.make_current()
	banner(definition.title,definition.subtitle,3.5)
	Audio.music("stage_%d" % index)

func add_terrain(pos: Vector2,size_value: Vector2):
	var terrain = Terrain.new()
	terrain.world = self
	terrain.biome = index
	terrain.position = pos
	terrain.size = size_value
	add_child(terrain)
	return terrain

func mechanism(kind: String,pos: Vector2):
	var m = Mechanism.new()
	m.world = self
	m.kind = kind
	m.position = pos
	add_child(m)
	return m

func spawn_pickup(pos: Vector2,kind: String) -> void:
	var p = Pickup.new()
	p.position = pos
	p.kind = kind
	p.world = self
	add_child(p)

func spawn_player() -> void:
	player = Player.new()
	player.world = self
	player.position = checkpoint
	add_child(player)

func spawn_boss() -> void:
	boss = Boss.new()
	boss.world = self
	boss.biome = index
	boss.position = Vector2(length-650,620)
	boss.arena_left = definition.arena
	boss.arena_right = length- 60
	add_child(boss)

func build_decoration() -> void:
	var rng = RandomNumberGenerator.new()
	rng.seed = 617+index
	for f in definition.floors:
		for x in range(int(f[0]+100),int(f[0]+f[2]- 80),330):
			var choices = [["tree","fern","pillar"],["machine","lamp","pillar"],["crystal","pillar","crystal"],["machine","lamp","pillar"],["pillar","crystal","lamp"]][index]
			var kind = choices[rng.randi_range(0,choices.size()-1)]
			var sprite = Sprite2D.new()
			sprite.texture = load("res://assets/art/world/"+kind+".svg")
			sprite.centered = false
			var scale_value = rng.randf_range(.4,.7) if kind!="tree" else rng.randf_range(.8,1.15)
			sprite.scale = Vector2.ONE*scale_value
			sprite.position = Vector2(x,float(f[1]))-Vector2(sprite.texture.get_width()*.5,sprite.texture.get_height())*scale_value
			sprite.z_index = -7 if kind=="tree" else -3
			if kind=="tree": sprite.modulate = Color(.65,.81,.78,.85)
			add_child(sprite)
		if index==0:
			for x in range(int(f[0]+25),int(f[0]+f[2]-50),150):
				var fern = Sprite2D.new()
				fern.texture = load("res://assets/art/world/fern.svg")
				fern.scale = Vector2.ONE*rng.randf_range(.32,.55)
				fern.position = Vector2(x,float(f[1])-fern.texture.get_height()*fern.scale.y*.5)
				fern.z_index = 10
				add_child(fern)
	for marker in [2300.0, length-1800.0]:
		var landmark = Sprite2D.new()
		landmark.texture = load("res://assets/art/world/landmark_%d.svg" % index)
		landmark.position = Vector2(marker,375)
		landmark.modulate = Color(.72,.85,.85,.85)
		landmark.z_index = -6
		add_child(landmark)
	for sign_data in definition.signs:
		var sign_label = Label.new()
		sign_label.position = Vector2(sign_data[0]-160,225)
		sign_label.size = Vector2(440,45)
		sign_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		sign_label.text = sign_data[1]
		sign_label.add_theme_font_size_override("font_size",15)
		sign_label.add_theme_color_override("font_color",Color("e1efdd"))
		sign_label.add_theme_color_override("font_shadow_color",Color("17293b"))
		sign_label.add_theme_constant_override("shadow_offset_y",2)
		add_child(sign_label)

func _process(delta: float) -> void:
	if completed: return
	if not player.dead: elapsed += delta
	banner_timer = maxf(0,banner_timer-delta)
	if not player.dead:
		var target = player.position+Vector2(player.facing*90,-220)
		target.y = clampf(target.y,180,360)
		if boss_started and not boss_defeated:
			target.x = clampf(target.x,definition.arena+570,length-570)
		camera.position = target
	camera_shake = maxf(0,camera_shake-delta*25)
	camera.offset = Vector2(sin(elapsed* 81),cos(elapsed* 67))*camera_shake if GameState.settings.shake else Vector2.ZERO
	if not boss_started and not boss_defeated and not player.dead and player.position.x > definition.arena+120:
		start_boss()

func start_boss() -> void:
	boss_started = true
	arena_gate = StaticBody2D.new()
	arena_gate.position = Vector2(definition.arena,330)
	arena_gate.collision_layer = 2
	var shape = CollisionShape2D.new()
	var rectangle = RectangleShape2D.new()
	rectangle.size = Vector2(20,700)
	shape.shape = rectangle
	arena_gate.add_child(shape)
	var line = Line2D.new()
	line.points = PackedVector2Array([Vector2(0,-350),Vector2(0,300)])
	line.width = 6
	line.default_color = definition.accent
	arena_gate.add_child(line)
	add_child(arena_gate)
	player.health = player.max_health
	player.energy = 100
	boss.activate()

func on_player_death() -> void:
	if respawning: return
	respawning = true
	deaths += 1
	banner("SIGNAL LOST","Returning to checkpoint",1.1)
	get_tree().create_timer(1.1,false).timeout.connect(respawn)

func respawn() -> void:
	if not is_inside_tree(): return
	# Boss encounter resets as a unit; no attacks, barriers or references survive a retry.
	for shot in get_tree().get_nodes_in_group("projectiles"): shot.queue_free()
	for effect in get_tree().get_nodes_in_group("shot_effects"): effect.queue_free()
	if boss_started and not boss_defeated:
		if is_instance_valid(boss):
			remove_child(boss)
			boss.queue_free()
		if is_instance_valid(arena_gate): arena_gate.queue_free()
		boss_started = false
		spawn_boss()
	if is_instance_valid(player):
		remove_child(player)
		player.queue_free()
	spawn_player()
	player.invincible = 2.0
	camera.position = checkpoint+Vector2(0,-260)
	camera.reset_smoothing()
	respawning = false
	Audio.music("stage_%d" % index)

func on_boss_defeated() -> void:
	boss_defeated = true
	score += 5000
	for shot in get_tree().get_nodes_in_group("projectiles"): shot.queue_free()
	for effect in get_tree().get_nodes_in_group("shot_effects"): effect.queue_free()
	if is_instance_valid(arena_gate): arena_gate.queue_free()
	player.invincible = 4.0
	banner("GUARDIAN DEFEATED","Enter the gate to continue",5)
	Audio.music("stage_%d" % index)
	Audio.play("win")
	shake(18)

func finish() -> void:
	if completed or not boss_defeated: return
	completed = true
	player.frozen = true
	player.rig.victory = true
	score += maxi(0,3000-int(elapsed*5))
	GameState.complete(index,score,elapsed,gems,relics)
	get_parent().stage_finished()

func projectile(pos: Vector2,vel: Vector2,friendly: bool,damage: int,color: Color,kind: String = "bolt",family: String = "",spawn_muzzle: bool = true) -> int:
	if get_tree().get_nodes_in_group("projectiles").size()>200:
		return -1
	if family.is_empty():
		family = "player_pulse" if friendly else "enemy_bolt"
	shot_serial += 1
	var current_shot_id = shot_serial
	var shot = Projectile.new()
	shot.world = self
	shot.position = pos
	shot.velocity = vel
	shot.friendly = friendly
	shot.damage = damage
	shot.tint = color
	shot.kind = kind
	shot.family = family
	shot.shot_id = current_shot_id
	if spawn_muzzle:
		shot_effect(pos, family, current_shot_id, 0, 3, vel.normalized(), 64.0 if kind != "nova" else 88.0)
	# Some calls originate inside physics callbacks. Defer scene attachment safely.
	add_child.call_deferred(shot)
	return current_shot_id

func shot_effect(pos: Vector2,family: String,shot_id: int,first_frame: int,last_frame: int,direction: Vector2,display_height: float = 64.0) -> bool:
	if Sheet16.find_path("projectiles", family).is_empty():
		return false
	var effect = ShotEffect.new()
	effect.position = pos
	effect.family = family
	effect.shot_id = shot_id
	effect.first_frame = first_frame
	effect.last_frame = last_frame
	effect.direction = direction if direction.length_squared() > 0.0 else Vector2.RIGHT
	effect.display_height = display_height
	add_child.call_deferred(effect)
	return true

func burst(pos: Vector2,color: Color,count: int) -> void:
	if is_instance_valid(fx): fx.burst(pos,color,count)
func shake(amount: float) -> void:
	camera_shake = maxf(camera_shake,amount)
func banner(title: String,subtitle: String,duration: float = 2.8) -> void:
	banner_title = title
	banner_subtitle = subtitle
	banner_timer = duration
