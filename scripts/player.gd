extends CharacterBody2D
class_name Player

const HeroModel3DScript = preload("res://scripts/hero_model_3d.gd")

signal health_changed(value: int)
signal coins_changed(value: int)
signal died

const WALK_SPEED := 320.0
const RUN_SPEED := 520.0
const ACCELERATION := 2500.0
const AIR_ACCELERATION := 1500.0
const FRICTION := 2900.0
const GRAVITY := 1650.0
const JUMP_VELOCITY := -610.0
const MAX_FALL_SPEED := 980.0
const COYOTE_TIME := 0.12
const JUMP_BUFFER_TIME := 0.13
const SHOOT_COOLDOWN := 0.15

var max_health := 8
var health := 8
var coins := 0
var facing := 1.0
var coyote_timer := 0.0
var jump_buffer_timer := 0.0
var shoot_timer := 0.0
var invulnerability_timer := 0.0
var afterimage_timer := 0.0
var visual_time := 0.0
var touch_left := false
var touch_right := false
var touch_jump := false
var touch_shoot := false
var touch_run := false
var jump_was_pressed := false
var spawn_position := Vector2.ZERO
var bullet_scene_owner: Node = null
var sprite: Sprite2D
var model_viewport: SubViewport
var hero_model: HeroModel3D
var collision_node: CollisionShape2D
var crouching := false

func _ready() -> void:
	add_to_group("player")
	spawn_position = global_position
	collision_layer = 1
	collision_mask = 2 | 4
	floor_snap_length = 8.0

	collision_node = CollisionShape2D.new()
	var capsule := CapsuleShape2D.new()
	capsule.radius = 17.0
	capsule.height = 64.0
	collision_node.shape = capsule
	collision_node.position = Vector2(0, -4)
	add_child(collision_node)

	build_live_3d_character()

	health_changed.emit(health)
	queue_redraw()

func _process(delta: float) -> void:
	visual_time += delta
	afterimage_timer = maxf(0.0, afterimage_timer - delta)

	if sprite:
		sprite.flip_h = facing < 0.0
		sprite.visible = int(invulnerability_timer * 18.0) % 2 == 0 if invulnerability_timer > 0.0 else true

	if hero_model:
		var fire_pulse := 1.0 if shoot_timer > SHOOT_COOLDOWN * 0.55 else 0.0
		hero_model.set_motion(velocity.x / RUN_SPEED, velocity.y, is_on_floor(), crouching, fire_pulse)

	if is_on_floor() and absf(velocity.x) > 430.0 and afterimage_timer <= 0.0:
		spawn_afterimage()
		afterimage_timer = 0.075

	queue_redraw()

func build_live_3d_character() -> void:
	model_viewport = SubViewport.new()
	model_viewport.name = "Hero3DViewport"
	model_viewport.size = Vector2i(320, 320)
	model_viewport.transparent_bg = true
	model_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	model_viewport.own_world_3d = true
	add_child(model_viewport)

	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color(0, 0, 0, 0)
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("b8e9e5")
	environment.ambient_light_energy = 1.15

	var world_environment := WorldEnvironment.new()
	world_environment.environment = environment
	model_viewport.add_child(world_environment)

	var key_light := DirectionalLight3D.new()
	key_light.light_color = Color("d8ffff")
	key_light.light_energy = 1.35
	key_light.rotation_degrees = Vector3(-28, -32, 0)
	model_viewport.add_child(key_light)

	var rim_light := OmniLight3D.new()
	rim_light.light_color = Color("39fff0")
	rim_light.light_energy = 2.0
	rim_light.omni_range = 6.0
	rim_light.position = Vector3(-2.4, 2.3, 2.8)
	model_viewport.add_child(rim_light)

	hero_model = HeroModel3DScript.new()
	hero_model.position = Vector3(0, -0.15, 0)
	model_viewport.add_child(hero_model)

	var camera := Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 4.7
	model_viewport.add_child(camera)
	camera.position = Vector3(0.15, 0.55, 6.5)
	camera.look_at(Vector3(0.0, 0.45, 0.0), Vector3.UP)
	camera.current = true

	sprite = Sprite2D.new()
	sprite.name = "Live3DCharacter"
	sprite.texture = model_viewport.get_texture()
	sprite.position = Vector2(0, -46)
	sprite.scale = Vector2(0.34, 0.34)
	add_child(sprite)

func _physics_process(delta: float) -> void:
	shoot_timer = maxf(0.0, shoot_timer - delta)
	jump_buffer_timer = maxf(0.0, jump_buffer_timer - delta)
	invulnerability_timer = maxf(0.0, invulnerability_timer - delta)

	if is_on_floor():
		coyote_timer = COYOTE_TIME
	else:
		coyote_timer = maxf(0.0, coyote_timer - delta)
		velocity.y = minf(velocity.y + GRAVITY * delta, MAX_FALL_SPEED)

	var left := Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT) or touch_left
	var right := Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT) or touch_right
	var run_pressed := Input.is_key_pressed(KEY_SHIFT) or touch_run
	var crouch_pressed := Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)
	crouching = crouch_pressed and is_on_floor()
	update_crouch_state()

	var direction := float(int(right) - int(left))
	var target_speed := direction * (135.0 if crouching else (RUN_SPEED if run_pressed else WALK_SPEED))
	var accel := ACCELERATION if is_on_floor() else AIR_ACCELERATION

	if direction != 0.0:
		velocity.x = move_toward(velocity.x, target_speed, accel * delta)
		facing = signf(direction)
	else:
		velocity.x = move_toward(velocity.x, 0.0, FRICTION * delta)

	var keyboard_jump := Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP)
	if (keyboard_jump and not jump_was_pressed) or touch_jump:
		jump_buffer_timer = JUMP_BUFFER_TIME
		touch_jump = false

	if not keyboard_jump and jump_was_pressed and velocity.y < -180.0:
		velocity.y *= 0.52
	jump_was_pressed = keyboard_jump

	if jump_buffer_timer > 0.0 and coyote_timer > 0.0:
		velocity.y = JUMP_VELOCITY
		jump_buffer_timer = 0.0
		coyote_timer = 0.0

	if (Input.is_key_pressed(KEY_SPACE) or Input.is_key_pressed(KEY_J) or Input.is_key_pressed(KEY_K) or touch_shoot) and shoot_timer <= 0.0:
		shoot()
		shoot_timer = SHOOT_COOLDOWN

	move_and_slide()

	if global_position.y > 950.0:
		take_damage(1, global_position.x)
		respawn()

func shoot() -> void:
	if bullet_scene_owner != null and bullet_scene_owner.has_method("spawn_bullet"):
		var muzzle_y := 7.0 if crouching else -14.0
		bullet_scene_owner.call("spawn_bullet", global_position + Vector2(38.0 * facing, muzzle_y), facing)
		if sprite:
			var old_scale := sprite.scale
			sprite.scale = Vector2(old_scale.x * 1.06, old_scale.y * 0.95)
			var recoil := create_tween()
			recoil.tween_property(sprite, "scale", old_scale, 0.08)

func update_crouch_state() -> void:
	if collision_node == null:
		return
	var capsule := collision_node.shape as CapsuleShape2D
	if capsule == null:
		return
	if crouching:
		capsule.height = 42.0
		collision_node.position.y = 7.0
	else:
		capsule.height = 64.0
		collision_node.position.y = -4.0

func take_damage(amount: int, source_x: float = 0.0) -> void:
	if invulnerability_timer > 0.0:
		return
	invulnerability_timer = 0.85
	health = maxi(0, health - amount)
	health_changed.emit(health)

	if source_x != 0.0:
		velocity.x = 420.0 if global_position.x > source_x else -420.0
		velocity.y = -260.0

	if health <= 0:
		died.emit()
		health = max_health
		health_changed.emit(health)
		respawn()

func add_coin() -> void:
	coins += 1
	coins_changed.emit(coins)

func set_checkpoint(new_position: Vector2) -> void:
	spawn_position = new_position
	if health < max_health:
		health = mini(max_health, health + 2)
		health_changed.emit(health)

func respawn() -> void:
	global_position = spawn_position
	velocity = Vector2.ZERO

func boost_horizontal(speed: float, direction: float = 1.0) -> void:
	velocity.x = speed * direction
	facing = direction

func spring(power: float = 850.0) -> void:
	velocity.y = -absf(power)

func set_touch_state(action: String, pressed: bool) -> void:
	match action:
		"left":
			touch_left = pressed
		"right":
			touch_right = pressed
		"jump":
			if pressed:
				touch_jump = true
		"shoot":
			touch_shoot = pressed
		"run":
			touch_run = pressed

func spawn_afterimage() -> void:
	if sprite == null or get_parent() == null:
		return
	var ghost := Sprite2D.new()
	ghost.texture = sprite.texture
	ghost.scale = sprite.scale
	ghost.flip_h = sprite.flip_h
	ghost.global_position = global_position + sprite.position
	ghost.modulate = Color(0.25, 1.0, 0.92, 0.20)
	ghost.z_index = z_index - 1
	get_parent().add_child(ghost)
	var fade := ghost.create_tween()
	fade.set_parallel(true)
	fade.tween_property(ghost, "modulate:a", 0.0, 0.18)
	fade.tween_property(ghost, "scale", ghost.scale * 1.04, 0.18)
	fade.chain().tween_callback(ghost.queue_free)

func _draw() -> void:
	draw_ellipse_shadow(Vector2(0, 0), 26.0, 7.0)

func draw_ellipse_shadow(center: Vector2, rx: float, ry: float) -> void:
	var points := PackedVector2Array()
	for i in range(20):
		var a := TAU * float(i) / 20.0
		points.append(center + Vector2(cos(a) * rx, sin(a) * ry))
	draw_colored_polygon(points, Color(0.0, 0.0, 0.0, 0.24))
