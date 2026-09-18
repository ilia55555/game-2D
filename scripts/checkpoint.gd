extends Area2D
class_name StageCheckpoint

var checkpoint_index := 0
var activated := false
var pulse := 0.0

func _ready() -> void:
	collision_layer = 0
	collision_mask = 1
	var collision := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(70, 150)
	collision.shape = shape
	collision.position = Vector2(0, -55)
	add_child(collision)
	body_entered.connect(_on_body_entered)
	queue_redraw()

func _process(delta: float) -> void:
	pulse += delta
	queue_redraw()

func _on_body_entered(body: Node) -> void:
	if activated:
		return
	if body.has_method("set_checkpoint"):
		activated = true
		body.call("set_checkpoint", global_position + Vector2(70, -60))
		queue_redraw()

func _draw() -> void:
	var c := Color("ffe064") if activated else Color("52fff0")
	var glow_alpha := 0.18 + sin(pulse * 4.0) * 0.06
	draw_circle(Vector2(0, -72), 34, Color(c, glow_alpha))
	draw_line(Vector2(0, 0), Vector2(0, -106), Color("344b56"), 10)
	draw_circle(Vector2(0, -72), 19, c)
	draw_circle(Vector2(0, -72), 9, Color("eaffff"))
	draw_arc(Vector2(0, -72), 29, 0, TAU, 28, Color(c, 0.7), 4)
