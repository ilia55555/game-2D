extends CharacterBody2D
class_name VelocityPlayer
const Rig = preload("res://scripts/hero_rig.gd")
const GRAVITY: float = 1800.0
const JUMP: float = -640.0
const SPEED: float = 470.0
var world
var rig
var health: int = 8
var max_health: int = 8
var facing: float = 1
var weapon: int = 0
var energy: float = 100
var coyote: float = 0
var buffer: float = 0
var jumps: int = 2
var fire_timer: float = 0
var invincible: float = 0
var dash_timer: float = 0
var dash_cooldown: float = 0
var knockback: float = 0
var dead: bool = false
var frozen: bool = false
var crouching: bool = false
var forced_boost: float = 0
var dust_timer: float = 0
var standing_shape: CapsuleShape2D
var collider: CollisionShape2D
var automation: bool = false
var auto_move: float = 0
var auto_jump: bool = false
var auto_fire: bool = false
var last_grounded: bool = false

func _ready() -> void:
	add_to_group("player")
	collision_layer = 1
	collision_mask = 2
	floor_snap_length = 8
	standing_shape = CapsuleShape2D.new()
	standing_shape.radius =  15.0
	standing_shape.height = 64
	collider = CollisionShape2D.new()
	collider.shape = standing_shape
	collider.position.y = -32
	add_child(collider)
	rig = Rig.new()
	add_child(rig)
	z_index = 8


func _physics_process(delta: float) -> void:
	if dead or frozen:
		rig.pose(delta, 0, 0, true, false, false, facing)
		return
	invincible = maxf(0, invincible - delta)
	fire_timer = maxf(0, fire_timer - delta)
	dash_cooldown = maxf(0, dash_cooldown - delta)
	knockback = maxf(0, knockback - delta)
	forced_boost = maxf(0, forced_boost - delta)
	buffer = maxf(0, buffer - delta)
	energy = minf(100, energy + delta * 11)
	var move = auto_move if automation else Input.get_axis("move_left", "move_right")
	var want_jump = auto_jump if automation else Input.is_action_just_pressed("jump")
	var firing = auto_fire if automation else Input.is_action_pressed("fire")
	auto_jump = false
	if is_on_floor():
		coyote = .12
		jumps = 2
	else:
		coyote = maxf(0, coyote - delta)
	if want_jump: buffer = .14
	if absf(move) > .1 and dash_timer <= 0: facing = signf(move)
	var wants_duck = not automation and Input.is_action_pressed("crouch") and is_on_floor()
	if crouching and not wants_duck:
		# Do not restore the standing shape while a low ceiling overlaps it.
		var query = PhysicsShapeQueryParameters2D.new()
		var full_shape = CapsuleShape2D.new()
		full_shape.radius = 15
		full_shape.height = 64
		query.shape = full_shape
		query.transform = Transform2D(0, global_position + Vector2(0, -32))
		query.collision_mask = 2
		query.exclude = [get_rid()]
		wants_duck = not get_world_2d().direct_space_state.intersect_shape(query, 1).is_empty()
	crouching = wants_duck
	standing_shape.height =  42.0 if crouching else 64
	collider.position.y = -standing_shape.height * .5
	if not automation and Input.is_action_just_pressed("weapon"):
		weapon = (weapon + 1) % 3
		Audio.play("ui", 1.1)
	if not automation:
		for index in range(3):
			if Input.is_physical_key_pressed(KEY_1 + index): weapon = index
	if not automation and Input.is_action_just_pressed("dash") and dash_cooldown <= 0:
		dash_timer = .19
		dash_cooldown = .8
		Audio.play("dash")
		world.burst(global_position + Vector2(0,-30), Color("8effdc"), 12)
	if buffer > 0 and jumps > 0:
		if coyote > 0: jumps = 2
		elif jumps == 2: jumps = 1
		velocity.y = JUMP if jumps == 2 else JUMP * .90
		jumps -= 1
		buffer = 0
		coyote = 0
		Audio.play("jump", 1.0 if jumps == 1 else 1.3)
		world.burst(global_position, Color("a9ffdc"), 8)
	if not automation and Input.is_action_just_released("jump") and velocity.y < -220:
		velocity.y *= .55
	if dash_timer > 0:
		dash_timer -= delta
		velocity = Vector2(facing * 950, 0)
	else:
		velocity.y = minf(1050, velocity.y + GRAVITY * delta)
		if knockback <= 0 and forced_boost <= 0:
			velocity.x = move_toward(velocity.x, move * (150 if crouching else SPEED), (3200 if is_on_floor() else 2100) * delta)
	if firing and fire_timer <= 0: shoot()
	var landed_before = is_on_floor()
	move_and_slide()
	if not landed_before and is_on_floor():
		rig.landing = 1
		world.burst(global_position, Color("9bbba4"), 6)
	if dash_timer > 0 and is_on_wall(): dash_timer = 0
	dust_timer -= delta
	if dust_timer <= 0 and ((is_on_floor() and absf(velocity.x) > 100) or dash_timer > 0):
		dust_timer = .09
		world.burst(global_position + Vector2(-facing*10,-4), Color("95c9b6"), 2)
	rig.pose(delta, velocity.x, velocity.y, is_on_floor(), crouching, dash_timer > 0, facing)
	rig.visible = invincible <= 0 or int(invincible * 20) % 2 == 0
	if position.y > 900: die()
	position.x = clampf(position.x, 20, world.length - 20)
	queue_redraw()


func shoot() -> void:
	var cost = [0, 8, 12][weapon]
	var actual = weapon if energy >= cost else 0
	var origin = global_position + Vector2(55 * facing, -47 + (17 if crouching else 0))
	var direction = Vector2(facing, 0)
	# Keyboard keeps run-and-gun aiming predictable; targets above can be reached by jumping.
	match actual:
		0:
			world.projectile(origin, direction * 1000, true, 1, Color("a9ffdf"), "bolt", "player_pulse", true)
			fire_timer = .14
		1:
			for angle in [-.15, 0.0, .15]:
				world.projectile(origin, direction.rotated(angle) * 850, true, 1, Color("ffcf81"), "bolt", "player_scatter", is_zero_approx(angle))
			energy -= 8
			fire_timer = .27
		2:
			world.projectile(origin, direction * 720, true, 4, Color("c7adff"), "nova", "player_nova", true)
			energy -= 12
			fire_timer = .42
	rig.recoil = 1
	Audio.play("shoot", 1.0 + actual * .12, .55)

func take_damage(amount: int, source: Vector2 = Vector2.ZERO) -> void:
	if dead or frozen or invincible > 0 or dash_timer > 0: return
	health = maxi(0, health - amount)
	invincible = 1.25 if not GameState.settings.assist else 2.0
	knockback = .23
	velocity = Vector2(signf(global_position.x - source.x) * 330, -240)
	rig.hurt = 1
	rig.color_flash = 1
	world.shake(9)
	Audio.play("hit")
	world.burst(global_position + Vector2(0,-32), Color("ffd7ab"), 14)
	if health <= 0: die()

func die() -> void:
	if dead or frozen: return
	dead = true
	rig.dead = true
	Audio.play("explode", .8)
	world.on_player_death()

func spring(power: float = 900) -> void:
	velocity.y = -power
	jumps = 1
	coyote = 0
	dash_timer = 0
	Audio.play("spring")

func _draw() -> void:
	if is_on_floor():
		draw_set_transform(Vector2(0,1),0,Vector2(1,.22))
		draw_circle(Vector2.ZERO, 24, Color(0.03,0.06,0.09,.3))
