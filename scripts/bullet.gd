extends Area2D
class_name Bullet

var direction := 1.0
var speed := 760.0
var lifetime := 1.5
var damage := 1

func _ready() -> void:
	collision_layer = 8
	collision_mask = 4
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = Vector2(14, 6)
	shape.shape = rect
	add_child(shape)
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
	draw_rect(Rect2(Vector2(-8,-3), Vector2(16,6)), Color("ffef70"), true)
	draw_circle(Vector2(8 * direction, 0), 4.0, Color("ffffff"))
