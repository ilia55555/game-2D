extends Area2D
class_name CoinPickup

var t := 0.0

func _ready() -> void:
	collision_layer = 16
	collision_mask = 1
	var shape_node := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = 14.0
	shape_node.shape = shape
	add_child(shape_node)
	body_entered.connect(_on_body_entered)
	queue_redraw()

func _process(delta: float) -> void:
	t += delta
	rotation = sin(t * 2.7) * 0.10
	scale = Vector2.ONE * (1.0 + sin(t * 4.4) * 0.06)
	queue_redraw()

func _on_body_entered(body: Node) -> void:
	if body.has_method("add_coin"):
		body.call("add_coin")
		queue_free()

func _draw() -> void:
	draw_circle(Vector2.ZERO, 20.0, Color(1.0, 0.82, 0.18, 0.10))
	draw_circle(Vector2.ZERO, 13.0, Color("ffd84b"))
	draw_circle(Vector2.ZERO, 8.0, Color("fff2a0"), false, 3.0)
	draw_circle(Vector2(-4, -5), 2.8, Color.WHITE)
