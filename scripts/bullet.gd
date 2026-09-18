extends Area2D
class_name Bullet

var direction := 1.0
var speed := 900.0
var lifetime := 1.6
var damage := 1
var trail: Line2D

func _ready() -> void:
	collision_layer = 8
	collision_mask = 4

	var shape_node := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(22, 8)
	shape_node.shape = shape
	add_child(shape_node)

	trail = Line2D.new()
	trail.width = 5.0
	trail.default_color = Color(0.38, 1.0, 0.94, 0.48)
	trail.points = PackedVector2Array([Vector2(-28.0 * direction, 0), Vector2.ZERO])
	add_child(trail)

	body_entered.connect(_on_body_entered)
	queue_redraw()

func _physics_process(delta: float) -> void:
	position.x += direction * speed * delta
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()

func _on_body_entered(body: Node) -> void:
	if body.has_method("hit"):
		body.call("hit", damage)
		queue_free()

func _draw() -> void:
	draw_circle(Vector2.ZERO, 11.0, Color(0.22, 1.0, 0.92, 0.15))
	draw_rect(Rect2(Vector2(-11,-4), Vector2(22,8)), Color("4fffe9"), true)
	draw_circle(Vector2(8 * direction, 0), 4.2, Color("f1ffff"))
