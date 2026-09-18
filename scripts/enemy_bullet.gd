extends Area2D
class_name EnemyBullet

var velocity := Vector2.LEFT * 320.0
var lifetime := 5.0
var damage := 1
var radius := 8.0

func _ready() -> void:
	collision_layer = 32
	collision_mask = 1
	var collision := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = radius
	collision.shape = shape
	add_child(collision)
	body_entered.connect(_on_body_entered)
	queue_redraw()

func _physics_process(delta: float) -> void:
	position += velocity * delta
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()

func _on_body_entered(body: Node) -> void:
	if body.has_method("take_damage"):
		body.call("take_damage", damage, global_position.x)
		queue_free()

func _draw() -> void:
	draw_circle(Vector2.ZERO, radius + 5.0, Color(1.0, 0.12, 0.08, 0.15))
	draw_circle(Vector2.ZERO, radius, Color("ff4938"))
	draw_circle(Vector2(-2, -2), radius * 0.45, Color("fff2a6"))
