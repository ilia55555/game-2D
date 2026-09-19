extends Node2D
## Swept collision prevents a fast shot passing through thin walls or small targets.
var world
var velocity: Vector2
var friendly: bool = true
var damage: int = 1
var tint: Color = Color.WHITE
var kind: String = "bolt"
var life: float = 2.5
var trail: Array[Vector2] = []
var spent: bool = false

func _ready() -> void:
	z_index = 12
	add_to_group("projectiles")

func _physics_process(delta: float) -> void:
	if spent: return
	life -= delta
	if life <= 0:
		queue_free()
		return
	var next = global_position + velocity * delta
	var query = PhysicsRayQueryParameters2D.create(global_position, next, 2 | (4 if friendly else 1))
	query.hit_from_inside = true
	var result = get_world_2d().direct_space_state.intersect_ray(query)
	if not result.is_empty():
		global_position = result.position
		var target = result.collider
		if friendly and target.has_method("hit"):
			target.hit(damage)
		elif not friendly and target.has_method("take_damage"):
			target.take_damage(damage, global_position - velocity * .05)
		if kind == "nova" and friendly:
			for enemy in get_tree().get_nodes_in_group("damageable"):
				if is_instance_valid(enemy) and enemy != target and enemy.global_position.distance_to(global_position) < 115:
					enemy.hit(2)
			world.burst(global_position, tint, 18)
			world.shake(4)
		world.burst(global_position, tint, 5)
		spent = true
		queue_free()
	else:
		global_position = next
	trail.push_front(global_position)
	if trail.size() > 5: trail.pop_back()
	queue_redraw()

func _draw() -> void:
	var backwards = -velocity.normalized()
	var radius = 7.0 if kind == "nova" else 4.0
	if not friendly: radius = 6.0
	draw_line(Vector2.ZERO, backwards * (32 if friendly else 18), Color(tint,.23), radius*3, true)
	draw_line(Vector2.ZERO, backwards * 20, tint, radius, true)
	draw_circle(Vector2.ZERO, radius, tint)
	draw_circle(Vector2.ZERO, radius*.48, Color("fffbe7"))
