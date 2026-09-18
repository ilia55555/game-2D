extends CharacterBody2D
class_name VarkonBoss

signal health_changed(current: int, maximum: int)
signal defeated

var max_health := 48
var health := 48
var active := false
var gravity := 1600.0
var attack_timer := 1.4
var attack_index := 0
var charge_timer := 0.0
var invulnerable := false
var arena_left := 24750.0
var arena_right := 27300.0

var sprite: Sprite2D
var player: Node
var world: Node

func _ready() -> void:
	collision_layer = 4
	collision_mask = 2
	world = get_parent()
	player = get_tree().get_first_node_in_group("player")

	var collision := CollisionShape2D.new()
	var capsule := CapsuleShape2D.new()
	capsule.radius = 58.0
	capsule.height = 168.0
	collision.shape = capsule
	collision.position = Vector2(0, 8)
	add_child(collision)

	sprite = Sprite2D.new()
	sprite.texture = load("res://assets/bosses/varkon.svg")
	sprite.scale = Vector2(0.55, 0.55)
	sprite.position = Vector2(0, -58)
	add_child(sprite)

	var hurt := Area2D.new()
	hurt.collision_layer = 0
	hurt.collision_mask = 1
	var hurt_shape_node := CollisionShape2D.new()
	var hurt_shape := CapsuleShape2D.new()
	hurt_shape.radius = 72
	hurt_shape.height = 190
	hurt_shape_node.shape = hurt_shape
	hurt_shape_node.position = Vector2(0, -6)
	hurt.add_child(hurt_shape_node)
	hurt.body_entered.connect(_on_player_contact)
	add_child(hurt)

func activate() -> void:
	if active:
		return
	active = true
	health_changed.emit(health, max_health)

func _physics_process(delta: float) -> void:
	if not active or health <= 0:
		return

	if not is_on_floor():
		velocity.y += gravity * delta

	if player == null:
		player = get_tree().get_first_node_in_group("player")
		if player == null:
			return

	attack_timer -= delta
	if charge_timer > 0.0:
		charge_timer -= delta
	else:
		var dx := player.global_position.x - global_position.x
		velocity.x = move_toward(velocity.x, signf(dx) * 105.0, 360.0 * delta)

	if attack_timer <= 0.0:
		perform_attack()
		attack_timer = 1.9 if health > max_health / 2 else 1.25

	move_and_slide()
	global_position.x = clampf(global_position.x, arena_left, arena_right)
	sprite.rotation = lerpf(sprite.rotation, clampf(velocity.x / 1100.0, -0.06, 0.06), 0.12)

func perform_attack() -> void:
	attack_index = (attack_index + 1) % 3
	match attack_index:
		0:
			fire_spread()
		1:
			var dx := player.global_position.x - global_position.x
			velocity.x = signf(dx) * (510.0 if health <= max_health / 2 else 410.0)
			charge_timer = 0.72
		2:
			velocity.y = -570.0
			fire_spread()

func fire_spread() -> void:
	if world == null or not world.has_method("spawn_enemy_bullet"):
		return
	var base := (player.global_position - (global_position + Vector2(0, -80))).normalized()
	for angle in [-0.28, -0.14, 0.0, 0.14, 0.28]:
		var dir := base.rotated(angle)
		world.call("spawn_enemy_bullet", global_position + Vector2(-55 * signf(base.x), -78), dir, 330.0 if health > max_health / 2 else 410.0)

func _on_player_contact(body: Node) -> void:
	if active and body.has_method("take_damage"):
		body.call("take_damage", 2, global_position.x)

func hit(amount: int) -> void:
	if not active or invulnerable or health <= 0:
		return
	health = maxi(0, health - amount)
	health_changed.emit(health, max_health)
	if sprite:
		sprite.modulate = Color("ff9f8d")
		var flash := create_tween()
		flash.tween_property(sprite, "modulate", Color.WHITE, 0.10)
	if health <= 0:
		die()

func die() -> void:
	active = false
	velocity = Vector2.ZERO
	collision_layer = 0
	collision_mask = 0
	defeated.emit()
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(self, "rotation", -0.18, 0.9)
	tw.tween_property(self, "modulate:a", 0.0, 1.2)
	tw.tween_property(self, "scale", Vector2(1.28, 0.72), 1.2)
	tw.chain().tween_callback(queue_free)
