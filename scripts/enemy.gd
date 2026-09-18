extends CharacterBody2D
class_name PatrolEnemy

signal defeated(section_id: int)

var start_position := Vector2.ZERO
var patrol_distance := 170.0
var speed := 92.0
var direction := 1.0
var health := 3
var gravity := 1600.0
var mode := "ground"
var section_id := 0
var enemy_index := 0
var life_time := 0.0
var shoot_timer := 1.8
var dying := false
var sprite: Sprite2D
var world: Node

func configure(enemy_mode: String, section: int, index: int) -> void:
	mode = enemy_mode
	section_id = section
	enemy_index = index
	if mode == "fly":
		health = 2
		speed = 105.0
		patrol_distance = 210.0
	else:
		health = 3 + (1 if index >= 13 else 0)

func _ready() -> void:
	start_position = global_position
	world = get_parent()
	collision_layer = 4
	collision_mask = 2 if mode == "ground" else 0
	shoot_timer = 1.2 + float(enemy_index % 4) * 0.32

	var shape_node := CollisionShape2D.new()
	if mode == "fly":
		var shape := CircleShape2D.new()
		shape.radius = 22.0
		shape_node.shape = shape
	else:
		var shape := RectangleShape2D.new()
		shape.size = Vector2(60, 74)
		shape_node.shape = shape
	if mode == "ground":
		shape_node.position = Vector2(0, -10)
	add_child(shape_node)

	sprite = Sprite2D.new()
	sprite.texture = load("res://assets/enemies/drone.png" if mode == "fly" else "res://assets/enemies/scout.png")
	sprite.scale = Vector2(0.72, 0.72)
	sprite.position = Vector2(0, -19 if mode == "ground" else 0)
	add_child(sprite)

	var hurt := Area2D.new()
	hurt.collision_layer = 0
	hurt.collision_mask = 1
	var hurt_shape_node := CollisionShape2D.new()
	var hurt_shape := CircleShape2D.new()
	hurt_shape.radius = 27.0
	hurt_shape_node.shape = hurt_shape
	hurt.add_child(hurt_shape_node)
	hurt.body_entered.connect(_on_player_contact)
	add_child(hurt)

func _physics_process(delta: float) -> void:
	if dying:
		return
	life_time += delta
	shoot_timer -= delta

	if mode == "fly":
		position.x += direction * speed * 0.62 * delta
		position.y = start_position.y + sin(life_time * 2.4 + float(enemy_index)) * 22.0
		if position.x > start_position.x + patrol_distance:
			direction = -1.0
		elif position.x < start_position.x - patrol_distance:
			direction = 1.0
	else:
		if not is_on_floor():
			velocity.y += gravity * delta
		velocity.x = direction * speed
		if global_position.x > start_position.x + patrol_distance:
			direction = -1.0
		elif global_position.x < start_position.x - patrol_distance:
			direction = 1.0
		move_and_slide()

	if sprite:
		sprite.flip_h = direction < 0.0
		sprite.rotation = sin(life_time * 5.0) * (0.035 if mode == "fly" else 0.015)

	try_shoot()

func try_shoot() -> void:
	if shoot_timer > 0.0 or world == null or not world.has_method("spawn_enemy_bullet"):
		return
	var target := get_tree().get_first_node_in_group("player")
	if target == null:
		return
	var delta_pos: Vector2 = target.global_position - global_position
	if delta_pos.length() > 680.0:
		return
	if mode == "fly" or enemy_index % 3 == 0:
		world.call("spawn_enemy_bullet", global_position, delta_pos.normalized(), 300.0)
		shoot_timer = 2.0 + float(enemy_index % 3) * 0.4

func _on_player_contact(body: Node) -> void:
	if not dying and body.has_method("take_damage"):
		body.call("take_damage", 1, global_position.x)

func hit(amount: int) -> void:
	if dying:
		return
	health -= amount
	if sprite:
		sprite.modulate = Color("ff9b88")
		var flash := create_tween()
		flash.tween_property(sprite, "modulate", Color.WHITE, 0.08)
	if health <= 0:
		die()

func die() -> void:
	dying = true
	collision_layer = 0
	collision_mask = 0
	defeated.emit(section_id)
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(self, "rotation", direction * 1.1, 0.28)
	tw.tween_property(self, "scale", Vector2(0.15, 0.15), 0.28)
	tw.tween_property(self, "modulate:a", 0.0, 0.28)
	tw.chain().tween_callback(queue_free)
