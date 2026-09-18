extends CharacterBody2D
class_name Player

signal health_changed(value: int)
signal coins_changed(value: int)
signal died

const WALK_SPEED := 300.0
const RUN_SPEED := 470.0
const ACCELERATION := 2200.0
const AIR_ACCELERATION := 1350.0
const FRICTION := 2600.0
const GRAVITY := 1500.0
const JUMP_VELOCITY := -560.0
const MAX_FALL_SPEED := 900.0
const COYOTE_TIME := 0.11
const JUMP_BUFFER_TIME := 0.12
const SHOOT_COOLDOWN := 0.16

var health := 5
var coins := 0
var facing := 1.0
var coyote_timer := 0.0
var jump_buffer_timer := 0.0
var shoot_timer := 0.0
var touch_left := false
var touch_right := false
var touch_jump := false
var touch_shoot := false
var touch_run := false
var jump_was_pressed := false
var spawn_position := Vector2.ZERO
var bullet_scene_owner: Node = null

func _ready() -> void:
	spawn_position = global_position
	collision_layer = 1
	collision_mask = 2 | 4
	var shape := CollisionShape2D.new()
	var capsule := CapsuleShape2D.new()
	capsule.radius = 13.0
	capsule.height = 46.0
	shape.shape = capsule
	shape.position = Vector2(0, -2)
	add_child(shape)
	queue_redraw()

func _physics_process(delta: float) -> void:
	shoot_timer = maxf(0.0, shoot_timer - delta)
	jump_buffer_timer = maxf(0.0, jump_buffer_timer - delta)

	if is_on_floor():
		coyote_timer = COYOTE_TIME
	else:
		coyote_timer = maxf(0.0, coyote_timer - delta)
		velocity.y = minf(velocity.y + GRAVITY * delta, MAX_FALL_SPEED)

	var left := Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT) or touch_left
	var right := Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT) or touch_right
	var run_pressed := Input.is_key_pressed(KEY_SHIFT) or touch_run
	var direction := float(int(right) - int(left))
	var target_speed := direction * (RUN_SPEED if run_pressed else WALK_SPEED)
	var accel := ACCELERATION if is_on_floor() else AIR_ACCELERATION

	if direction != 0.0:
		velocity.x = move_toward(velocity.x, target_speed, accel * delta)
		facing = signf(direction)
	else:
		velocity.x = move_toward(velocity.x, 0.0, FRICTION * delta)

	var keyboard_jump := Input.is_key_pressed(KEY_SPACE) or Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP)
	if (keyboard_jump and not jump_was_pressed) or touch_jump:
		jump_buffer_timer = JUMP_BUFFER_TIME
		touch_jump = false
	jump_was_pressed = keyboard_jump

	if jump_buffer_timer > 0.0 and coyote_timer > 0.0:
		velocity.y = JUMP_VELOCITY
		jump_buffer_timer = 0.0
		coyote_timer = 0.0

	if (Input.is_key_pressed(KEY_J) or Input.is_key_pressed(KEY_K) or touch_shoot) and shoot_timer <= 0.0:
		shoot()
		shoot_timer = SHOOT_COOLDOWN

	move_and_slide()

	if global_position.y > 760.0:
		take_damage(1)
		respawn()

	queue_redraw()

func shoot() -> void:
	if bullet_scene_owner != null and bullet_scene_owner.has_method("spawn_bullet"):
		bullet_scene_owner.call("spawn_bullet", global_position + Vector2(22.0 * facing, -4.0), facing)

func take_damage(amount: int) -> void:
	health = maxi(0, health - amount)
	health_changed.emit(health)
	if health <= 0:
		died.emit()
		health = 5
		health_changed.emit(health)
		respawn()

func add_coin() -> void:
	coins += 1
	coins_changed.emit(coins)

func respawn() -> void:
	global_position = spawn_position
	velocity = Vector2.ZERO

func set_touch_state(action: String, pressed: bool) -> void:
	match action:
		"left": touch_left = pressed
		"right": touch_right = pressed
		"jump":
			if pressed:
				touch_jump = true
		"shoot": touch_shoot = pressed
		"run": touch_run = pressed

func _draw() -> void:
	var flip := facing
	draw_circle(Vector2(0, 5), 17.0, Color("252542"))
	draw_circle(Vector2(0, -7), 16.0, Color("53e0c3"))
	draw_rect(Rect2(Vector2(-3 if flip > 0 else -16, -13), Vector2(19, 8)), Color("16223d"), true)
	draw_polygon(PackedVector2Array([Vector2(-10,-18), Vector2(-7,-43), Vector2(-1,-20)]), PackedColorArray([Color("53e0c3")]))
	draw_polygon(PackedVector2Array([Vector2(2,-20), Vector2(9,-39), Vector2(10,-16)]), PackedColorArray([Color("7fffe7")]))
	draw_rect(Rect2(Vector2(-16, 18), Vector2(14, 6)), Color("ffcc4d"), true)
	draw_rect(Rect2(Vector2(4, 18), Vector2(16, 6)), Color("ffcc4d"), true)
	var gun_x := 12.0 if flip > 0 else -28.0
	draw_rect(Rect2(Vector2(gun_x, -2), Vector2(18, 7)), Color("ff5c8a"), true)
