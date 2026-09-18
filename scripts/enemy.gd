extends CharacterBody2D
class_name PatrolEnemy

var start_x := 0.0
var patrol_distance := 135.0
var speed := 85.0
var direction := 1.0
var health := 3
var gravity := 1500.0

func _ready() -> void:
	start_x = global_position.x
	collision_layer = 4
	collision_mask = 2
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = Vector2(36, 34)
	shape.shape = rect
	add_child(shape)
	queue_redraw()

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y += gravity * delta
	velocity.x = direction * speed
	if global_position.x > start_x + patrol_distance:
		direction = -1.0
	elif global_position.x < start_x - patrol_distance:
		direction = 1.0
	move_and_slide()
	queue_redraw()

func hit(amount: int) -> void:
	health -= amount
	if health <= 0:
		queue_free()

func _draw() -> void:
	draw_circle(Vector2.ZERO, 18.0, Color("a05cff"))
	draw_rect(Rect2(Vector2(-14,-8), Vector2(28,12)), Color("4a246f"), true)
	draw_circle(Vector2(8 * direction, -2), 3.0, Color("ffffff"))
	draw_circle(Vector2(8 * direction, -2), 1.5, Color("ff4d6d"))
	draw_rect(Rect2(Vector2(-15,14), Vector2(10,5)), Color("ff8d4d"), true)
	draw_rect(Rect2(Vector2(5,14), Vector2(10,5)), Color("ff8d4d"), true)
