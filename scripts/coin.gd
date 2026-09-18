extends Area2D
class_name CoinPickup

var t := 0.0

func _ready() -> void:
	collision_layer = 16
	collision_mask = 1
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 12.0
	shape.shape = circle
	add_child(shape)
	body_entered.connect(_on_body_entered)
	queue_redraw()

func _process(delta: float) -> void:
	t += delta
	rotation = sin(t * 3.0) * 0.12
	queue_redraw()

func _on_body_entered(body: Node) -> void:
	if body.has_method("add_coin"):
		body.call("add_coin")
		queue_free()

func _draw() -> void:
	draw_circle(Vector2.ZERO, 11.0, Color("ffcf48"))
	draw_circle(Vector2.ZERO, 6.0, Color("fff4a8"), false, 2.0)
