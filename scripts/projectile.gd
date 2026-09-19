extends Node2D
## Swept collision prevents a fast shot passing through thin walls or small targets.
## If a 16-frame projectile sheet exists, the same family renders muzzle, travel and impact.
const Sheet16 = preload("res://scripts/sprite_sheet_16.gd")

var world
var velocity: Vector2
var friendly: bool = true
var damage: int = 1
var tint: Color = Color.WHITE
var kind: String = "bolt"
var family: String = ""
var shot_id: int = -1
var life: float = 2.5
var trail: Array[Vector2] = []
var spent: bool = false
var sprite16
var uses_sheet: bool = false

func _ready() -> void:
	z_index = 12
	add_to_group("projectiles")
	var path = Sheet16.find_path("projectiles", family)
	if not path.is_empty():
		sprite16 = Sheet16.new()
		add_child(sprite16)
		var display_height = 46.0 if kind == "nova" else (34.0 if friendly else 38.0)
		uses_sheet = sprite16.load_sheet(path, display_height, false)
		if uses_sheet:
			sprite16.rotation = velocity.angle()
			sprite16.play_clip("travel", 4, 7, 18.0, true, true)

func _physics_process(delta: float) -> void:
	if spent:
		return
	life -= delta
	if life <= 0:
		queue_free()
		return

	if uses_sheet and is_instance_valid(sprite16):
		sprite16.rotation = velocity.angle()

	var next = global_position + velocity * delta
	var query = PhysicsRayQueryParameters2D.create(global_position, next, 2 | (4 if friendly else 1))
	query.hit_from_inside = true
	var result = get_world_2d().direct_space_state.intersect_ray(query)
	if not result.is_empty():
		global_position = result.position
		var target = result.collider
		var actor_hit = false
		if friendly and target.has_method("hit"):
			target.hit(damage)
			actor_hit = true
		elif not friendly and target.has_method("take_damage"):
			target.take_damage(damage, global_position - velocity * .05)
			actor_hit = true

		if kind == "nova" and friendly:
			for enemy in get_tree().get_nodes_in_group("damageable"):
				if is_instance_valid(enemy) and enemy != target and enemy.global_position.distance_to(global_position) < 115:
					enemy.hit(2)
			world.shake(4)

		var effect_start = 12 if kind == "nova" or not actor_hit else 8
		var effect_end = 15 if effect_start == 12 else 11
		var sheet_effect = world.shot_effect(
			global_position,
			family,
			shot_id,
			effect_start,
			effect_end,
			velocity.normalized(),
			96.0 if kind == "nova" else 72.0
		)
		if not sheet_effect:
			world.burst(global_position, tint, 18 if kind == "nova" else 5)

		spent = true
		queue_free()
	else:
		global_position = next

	trail.push_front(global_position)
	if trail.size() > 5:
		trail.pop_back()
	queue_redraw()

func _draw() -> void:
	if uses_sheet:
		return
	var backwards = -velocity.normalized()
	var radius = 7.0 if kind == "nova" else 4.0
	if not friendly:
		radius = 6.0
	draw_line(Vector2.ZERO, backwards * (32 if friendly else 18), Color(tint,.23), radius*3, true)
	draw_line(Vector2.ZERO, backwards * 20, tint, radius, true)
	draw_circle(Vector2.ZERO, radius, tint)
	draw_circle(Vector2.ZERO, radius*.48, Color("fffbe7"))
