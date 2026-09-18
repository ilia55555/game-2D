extends CharacterBody2D
class_name Player

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

	sprite = Sprite2D.new()
	sprite.texture = load("res://assets/characters/hero.png")
	sprite.scale = Vector2(0.78, 0.78)
	sprite.position = Vector2(0, -36)
	add_child(sprite)

	health_changed.emit(health)
	queue_redraw()

func _process(delta: float) -> void:
	visual_time += delta
	afterimage_timer = maxf(0.0, afterimage_timer - delta)

	if sprite:
		sprite.flip_h = facing < 0.0
		var speed_ratio := clampf(absf(velocity.x) / RUN_SPEED, 0.0, 1.0)
		if crouching:
			sprite.position.y = -20.0
			sprite.rotation = lerpf(sprite.rotation, 0.0, 0.22)
		elif is_on_floor():
			sprite.position.y = -36.0 + sin(visual_time * 17.0) * 2.4 * speed_ratio
			sprite.rotation = lerpf(sprite.rotation, velocity.x / RUN_SPEED * 0.055, 0.18)
		else:
			sprite.position.y = -38.0
			sprite.rotation = lerpf(sprite.rotation, velocity.x / RUN_SPEED * 0.12, 0.12)

		if invulnerability_timer > 0.0:
			sprite.visible = int(invulnerability_timer * 18.0) % 2 == 0
		else:
			sprite.visible = true

		if is_on_floor() and absf(velocity.x) > 430.0 and afterimage_timer <= 0.0:
			spawn_afterimage()
			afterimage_timer = 0.075

	queue_redraw()

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
	if collision_node == null or sprite == null:
		return
	var capsule := collision_node.shape as CapsuleShape2D
	if capsule == null:
		return
	if crouching:
		capsule.height = 42.0
		collision_node.position.y = 7.0
		sprite.position.y = -20.0
		sprite.scale = Vector2(0.82, 0.60)
	else:
		capsule.height = 64.0
		collision_node.position.y = -4.0
		sprite.scale = Vector2(0.78, 0.78)

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
	ghost.rotation = sprite.rotation
	ghost.global_position = global_position + sprite.position
	ghost.modulate = Color(0.25, 1.0, 0.92, 0.24)
	ghost.z_index = z_index - 1
	get_parent().add_child(ghost)
	var fade := ghost.create_tween()
	fade.set_parallel(true)
	fade.tween_property(ghost, "modulate:a", 0.0, 0.23)
	fade.tween_property(ghost, "scale", ghost.scale * 1.08, 0.23)
	fade.chain().tween_callback(ghost.queue_free)

func _draw() -> void:
	draw_ellipse_shadow(Vector2(0, 0), 26.0, 7.0)

func draw_ellipse_shadow(center: Vector2, rx: float, ry: float) -> void:
	var points := PackedVector2Array()
	for i in range(20):
		var a := TAU * float(i) / 20.0
		points.append(center + Vector2(cos(a) * rx, sin(a) * ry))
	draw_colored_polygon(points, Color(0.0, 0.0, 0.0, 0.24))
