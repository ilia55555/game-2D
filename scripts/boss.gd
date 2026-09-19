extends CharacterBody2D
## Each guardian has its own attack cycle; all dangerous moves have a visible wind-up.
var world
var biome: int = 0
var active: bool = false
var defeated: bool = false
var health: int = 60
var max_health: int = 60
var arena_left: float
var arena_right: float
var state: String = "dormant"
var timer: float = 0
var clock: float = 0
var attack_number: int = 0
var attack: int = 0
var direction: float = -1
var lock_target: Vector2
var rain_targets: Array[Vector2] = []
var art: Sprite2D
var phase: int = 1
var flash: float = 0
var was_airborne: bool = false
var ring_timer: float = 0
var rig: Node2D
var arm_nodes: Array[Node2D] = []

func _ready() -> void:
	add_to_group("damageable")
	collision_layer = 4
	collision_mask = 0 if biome in [1,2] else 2
	max_health = [60,72, 84,96,128][biome]
	if GameState.settings.assist: max_health = int(max_health*.72)
	health = max_health
	var shape = CollisionShape2D.new()
	var body = RectangleShape2D.new()
	body.size = Vector2(146,130)
	shape.shape = body
	shape.position.y = - 70
	add_child(shape)
	rig = Node2D.new()
	add_child(rig)
	art = Sprite2D.new()
	art.texture = load("res://assets/art/bosses/"+world.definition.boss_art+".svg")
	art.scale = Vector2.ONE * .85
	art.position.y = - 90
	rig.add_child(art)
	if biome in [0,3,4]:
		for i in range(2):
			var pivot = Node2D.new()
			pivot.position = Vector2(-85 if i==0 else 85,-115)
			rig.add_child(pivot)
			var arm = Sprite2D.new()
			arm.texture = load("res://assets/art/bosses/"+world.definition.boss_art+"_arm_%d.svg" % i)
			arm.scale = Vector2.ONE*.85
			arm.position = Vector2(0,-90)-pivot.position
			pivot.add_child(arm)
			arm_nodes.append(pivot)
	z_index = 9

func activate() -> void:
	if active or defeated: return
	active = true
	state = "intro"
	timer = 1.7
	world.banner(world.definition.boss_name,"GUARDIAN AWAKENED")
	Audio.music("boss")
	Audio.play("alarm")

func _physics_process(delta: float) -> void:
	clock += delta
	flash = maxf(0,flash-delta*7)
	art.modulate = Color(1+flash*3,1+flash,1+flash)
	for i in range(arm_nodes.size()):
		var desired = sin(clock*2+i*PI)*.06
		if state=="telegraph": desired += (-.5 if i==0 else .5)
		if state=="attack": desired += (-.25 if i==0 else .25)
		arm_nodes[i].rotation = lerp_angle(arm_nodes[i].rotation,desired,minf(1,delta*8))
		arm_nodes[i].modulate = art.modulate
	if not active or defeated:
		art.position.y = -90 + sin(clock*1.7)*2
		return
	if not is_instance_valid(world.player) or world.player.dead: return
	timer -= delta
	var player = world.player
	if biome in [1,2]:
		if state!="attack": position.y = 550+sin(clock*1.5)*25
	else:
		velocity.y = minf(1000,velocity.y+1800*delta)
	match state:
		"intro":
			if timer<=0: set_state("idle",.7)
		"idle":
			velocity.x = move_toward(velocity.x,0,1200*delta)
			if timer<=0: prepare_attack()
		"telegraph":
			velocity.x = move_toward(velocity.x,0,1400*delta)
			if timer<=0: execute_attack()
		"attack":
			if attack==4:
				ring_timer -= delta
				if ring_timer<=0:
					ring_timer = .18
					var base = (player.global_position+Vector2(0,-40)-(global_position+Vector2(0,-70))).normalized()
					world.projectile(global_position+Vector2(0,-70),base.rotated(sin(clock*5)*.3)*350,false,1,Color("d7a9ff"))
			if attack==2 and was_airborne and is_on_floor():
				was_airborne = false
				slam()
			if timer<=0: set_state("recover",.8 if phase==1 else .55)
		"recover":
			velocity.x = move_toward(velocity.x,0,1100*delta)
			if timer<=0: set_state("idle",.45 if phase==1 else .22)
	move_and_slide()
	position.x = clampf(position.x,arena_left+100,arena_right-100)
	if state=="attack" and attack==1 and (position.x<=arena_left+105 or position.x>=arena_right-105): timer = 0
	var diff = player.global_position-global_position
	if absf(diff.x)<95 and diff.y<25 and diff.y>-155:
		player.take_damage(1 if GameState.settings.assist else 2,global_position)
	art.rotation = lerpf(art.rotation,velocity.x*.00016,delta*7)
	art.position.y = -90+sin(clock*(8 if state=="telegraph" else 3))*2.5
	rig.scale = Vector2(1+sin(clock*3)*.015,1-sin(clock*3)*.012)
	queue_redraw()

func set_state(value: String, seconds: float) -> void:
	state = value
	timer = seconds

func prepare_attack() -> void:
	var cycles = [[0,1,2],[0,3,1,4],[3,0,4],[2,1,0,2],[0,1,3,2,4]]
	attack = cycles[biome][attack_number%cycles[biome].size()]
	attack_number += 1
	direction = signf(world.player.position.x-position.x)
	if direction==0: direction = -1
	lock_target = world.player.global_position
	rain_targets.clear()
	if attack==3:
		for k in range(5):
			rain_targets.append(Vector2(clampf(lock_target.x+(k-2)*140,arena_left+65,arena_right-65),620))
	set_state("telegraph",1.05 if GameState.settings.assist else (.85 if phase==1 else .65))

func execute_attack() -> void:
	var origin = global_position+Vector2(0,-75)
	var aim = (lock_target+Vector2(0,-35)-origin).normalized()
	match attack:
		0:
			var count = 5 if phase==1 else 7
			for i in range(count):
				world.projectile(origin,aim.rotated((i-(count-1)*.5)*.17)*(290 if phase==1 else 340),false,1,Color("ffbd87"))
			set_state("attack",.35)
		1:
			velocity.x = direction*(570 if phase==1 else 690)
			set_state("attack",1.2)
		2:
			velocity = Vector2(direction*170,-650)
			was_airborne = true
			set_state("attack",1.0)
		3:
			for p in rain_targets:
				world.projectile(Vector2(p.x,160),Vector2(0,340),false,1,Color("d7b0ff"))
			set_state("attack",.8)
		4:
			ring_timer = 0
			set_state("attack",1.6)
	Audio.play("shoot",.65,.8)

func slam() -> void:
	world.shake(14)
	world.burst(global_position,Color("ffcf9a"), 30)
	for dir in [-1.0,1.0]:
		world.projectile(global_position+Vector2(dir*110,-12),Vector2(dir*450,0),false,1,Color("ffce8d"))
	Audio.play("explode",.6)

func hit(amount: int) -> void:
	if not active or defeated or state=="intro": return
	health = maxi(0,health-amount)
	flash = 1
	if phase==1 and health<=max_health/2:
		phase = 2
		world.banner("CORE OVERLOAD","The guardian is getting faster")
		world.shake(6)
	if health<=0:
		defeated = true
		active = false
		collision_layer = 0
		world.on_boss_defeated()
		world.burst(global_position+Vector2(0,-90),world.definition.accent,60)
		Audio.play("explode",.5)
		var t = create_tween().set_parallel(true)
		t.tween_property(art,"rotation",.25,1)
		t.tween_property(rig,"modulate:a",0,1)
		t.chain().tween_callback(queue_free)

func _draw() -> void:
	if not active or defeated: return
	if state=="telegraph":
		var color = Color("ffce8c")
		draw_arc(Vector2(0,-85),116,-PI/2,TAU*(1-clampf(timer,0,1))-PI/2,48,color,3,true)
		match attack:
			1:
				for i in range(3):
					var x = direction*(135+i*45)
					draw_polyline(PackedVector2Array([Vector2(x-direction*13,-25),Vector2(x,-15),Vector2(x-direction*13,-5)]),Color(color,.8),4,true)
			2:
				draw_line(Vector2(-150,-3),Vector2(150,-3),color,4,true)
			3:
				for p in rain_targets:
					var local = p-global_position
					draw_line(local,local+Vector2(0,-400),Color(color,.2),2,true)
					draw_rect(Rect2(local-Vector2(18,4),Vector2(36,4)),color)
	if phase==2:
		draw_arc(Vector2(0,-90),105,clock,clock+1.8,24,Color("edafff"),2,true)
