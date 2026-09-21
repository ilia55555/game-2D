extends CharacterBody2D
const Sheet16 = preload("res://scripts/sprite_sheet_16.gd")

var world
var kind: String = "crawler"
var health: int = 3
var max_health: int = 3
var home: Vector2
var facing: float = -1
var clock: float = 0
var attack_timer: float = 1.6
var warning: float = 0
var attack_pending: bool = false
var attack_visual: float = 0
var flash: float = 0
var dying: bool = false
var death_timer: float = 0
var body_art: Sprite2D
var legs: Array[Sprite2D] = []
var wings: Array[Sprite2D] = []
var rig: Node2D
var patrol: float = 105
var sprite16
var using_sheet16: bool = false

func _ready() -> void:
	add_to_group("damageable")
	add_to_group("enemies")
	home = global_position
	clock = position.x * .01
	health = {"crawler": 3,"hopper": 3,"turret": 4,"drone": 2,"sentinel": 6}[kind]
	if GameState.settings.assist: health = maxi(1,health-1)
	max_health = health
	attack_timer += fposmod(position.x,2.5)
	collision_layer = 4
	collision_mask = 0 if kind == "drone" else 2
	var shape = CollisionShape2D.new()
	var hitbox = RectangleShape2D.new()
	hitbox.size = Vector2(74,52) if kind!="sentinel" else Vector2(72,74)
	shape.shape = hitbox
	shape.position = Vector2(0,-30)
	add_child(shape)

	rig = Node2D.new()
	add_child(rig)
	var sheet_path = Sheet16.find_path("enemies", kind)
	if not sheet_path.is_empty():
		sprite16 = Sheet16.new()
		rig.add_child(sprite16)
		var target_height = 118.0 if kind == "sentinel" else (100.0 if kind == "drone" else 96.0)
		using_sheet16 = sprite16.load_sheet(sheet_path, target_height, kind != "drone")
		if using_sheet16:
			if kind == "drone":
				sprite16.position.y = -42.0
			sprite16.play_clip("idle", 0, 1, 3.0, true, true)

	if not using_sheet16:
		if is_instance_valid(sprite16):
			sprite16.queue_free()
			sprite16 = null
		if kind == "drone":
			for i in range(2):
				var wing = Sprite2D.new()
				wing.texture = load("res://assets/art/enemies/wing.svg")
				wing.scale = Vector2(.5 if i==0 else -.5,.5)
				wing.position = Vector2(-40 if i==0 else 40,-50)
				rig.add_child(wing)
				wings.append(wing)
		elif kind != "turret":
			for i in range(4):
				var leg = Sprite2D.new()
				leg.texture = load("res://assets/art/enemies/leg.svg")
				leg.scale = Vector2.ONE*.45
				leg.position = Vector2(-24+i*16,-10)
				rig.add_child(leg)
				legs.append(leg)
		body_art = Sprite2D.new()
		body_art.texture = load("res://assets/art/enemies/"+kind+".svg")
		body_art.scale = Vector2.ONE * .63
		body_art.position.y = -40
		rig.add_child(body_art)
	z_index = 7

func _physics_process(delta: float) -> void:
	if dying:
		if using_sheet16:
			death_timer -= delta
			if death_timer <= 0:
				queue_free()
		return
	if not is_instance_valid(world.player):
		return
	var target = world.player
	if absf(target.position.x - position.x) > 1200:
		return

	clock += delta
	attack_timer -= delta
	attack_visual = maxf(0, attack_visual-delta)
	flash = maxf(0,flash-delta*8)

	if kind=="drone":
		position.x = home.x + sin(clock*.65)*110
		position.y = home.y + sin(clock*2)*27
		facing = signf(target.position.x-position.x)
	elif kind=="turret":
		velocity.y = minf(1000,velocity.y+1800*delta)
		move_and_slide()
		facing = signf(target.position.x-position.x)
	else:
		velocity.y = minf(1000,velocity.y+1800*delta)
		if is_on_floor():
			var probe = global_position + Vector2(facing*50,-12)
			var q = PhysicsRayQueryParameters2D.create(probe,probe+Vector2(0,80),2)
			if get_world_2d().direct_space_state.intersect_ray(q).is_empty() or is_on_wall() or absf(position.x-home.x)>patrol:
				facing = -facing
				if absf(position.x-home.x)>patrol:
					facing = signf(home.x-position.x)
			velocity.x = facing * (90 if kind!="sentinel" else 65)
			if kind=="hopper" and sin(clock*2.1)>.97:
				velocity.y = -490
		else:
			velocity.x = facing * 85
		move_and_slide()

	if attack_pending:
		warning -= delta
		if warning <= 0:
			attack_pending = false
			shoot()
	elif attack_timer <= 0 and target.global_position.distance_to(global_position)<660 and not target.dead:
		var ray = PhysicsRayQueryParameters2D.create(global_position+Vector2(0,-38),target.global_position+Vector2(0,-32),2)
		if get_world_2d().direct_space_state.intersect_ray(ray).is_empty() and kind in ["turret","drone","sentinel"]:
			attack_pending = true
			warning = .55
		attack_timer = 2.5 if kind=="drone" else 3.0

	var diff = target.global_position-global_position
	if absf(diff.x)<48 and absf(diff.y)<60 and not target.dead:
		if target.velocity.y>160 and target.position.y < position.y-40 and kind!="turret":
			hit(2)
			target.velocity.y = -430
		elif target.dash_timer>0:
			hit(4)
		else:
			target.take_damage(1,global_position)

	if using_sheet16:
		update_sheet_visual()
	else:
		rig.scale.x = -facing
		body_art.position.y = -40 + (sin(clock*6)*1.3 if is_on_floor() else 0)
		body_art.rotation = sin(clock*3)*.02
		body_art.modulate = Color(1+flash*3,1+flash,1+flash)
		for i in range(legs.size()):
			legs[i].rotation = sin(clock*9+i*PI/2)*.28 if absf(velocity.x)>0 else 0
		for i in range(wings.size()):
			wings[i].rotation = sin(clock*18)*.14*(1 if i==0 else -1)

	if position.y>920:
		hit(100)
	queue_redraw()

func update_sheet_visual() -> void:
	if not using_sheet16 or not is_instance_valid(sprite16):
		return
	sprite16.flip_h = facing < 0
	if flash > 0.05:
		sprite16.play_clip("hurt", 14, 14, 1.0, false)
	elif attack_pending:
		sprite16.play_clip("telegraph", 8, 9, 7.0, true)
	elif attack_visual > .28:
		sprite16.play_clip("attack", 10, 12, 12.0, true)
	elif attack_visual > 0:
		sprite16.play_clip("recover", 13, 13, 1.0, false)
	elif kind == "drone":
		sprite16.play_clip("hover", 6, 7, 8.0, true)
	elif not is_on_floor() and kind == "hopper":
		sprite16.play_clip("air", 6, 7, 8.0, true)
	elif absf(velocity.x)>20 and kind!="turret":
		sprite16.play_clip("move", 2, 5, 10.0, true)
	else:
		sprite16.play_clip("idle", 0, 1, 3.0, true)

func shoot() -> void:
	if not is_instance_valid(world.player) or world.player.dead:
		return
	attack_visual = .55
	var origin = global_position+Vector2(0,-40)
	var dir = (world.player.global_position+Vector2(0,-30)-origin).normalized()
	if kind=="sentinel":
		for a in [-.13,0.0,.13]:
			world.projectile(origin,dir.rotated(a)*280,false,1,Color("ffb07d"),"bolt","enemy_bolt",is_zero_approx(a))
	else:
		world.projectile(origin,dir*(260 if GameState.settings.assist else 330),false,1,Color("ffb07d"),"bolt","enemy_bolt",true)

func hit(amount: int) -> void:
	if dying:
		return
	health -= amount
	flash = 1
	if health<=0:
		dying = true
		collision_layer = 0
		collision_mask = 0
		world.score += 250
		world.kills += 1
		Audio.play("explode",1.2,.55)
		world.burst(global_position+Vector2(0,-30),Color("ffd297"),20)
		if world.kills%5==0:
			world.spawn_pickup(global_position+Vector2(0,-30),"heal")
		if using_sheet16 and is_instance_valid(sprite16):
			sprite16.play_clip("death",15,15,1.0,false,true)
			death_timer = .38
		else:
			queue_free()

func _draw() -> void:
	if attack_pending:
		draw_arc(Vector2(0,-42),48,-PI/2,TAU*(1-warning/.55)-PI/2,36,Color("ffbf79"),3,true)
		draw_circle(Vector2(0,-42),6,Color("fff0b0"))
	if health<max_health and not dying:
		draw_rect(Rect2(-20,-80,40,4),Color("23344f"))
		draw_rect(Rect2(-20,-80,40*float(health)/max_health,4),Color("ffd2a0"))
