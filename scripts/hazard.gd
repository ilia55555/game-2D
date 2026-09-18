extends Area2D
class_name HazardZone

var zone_size := Vector2(180, 45)
var kill_zone := false
var hot := false

func configure(size: Vector2, lethal: bool = false, corrupted: bool = false) -> void:
	zone_size = size
	kill_zone = lethal
	hot = corrupted

func _ready() -> void:
	collision_layer = 0
	collision_mask = 1
	var collision := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = zone_size
	collision.shape = shape
	add_child(collision)
	body_entered.connect(_on_body_entered)
	queue_redraw()

func _on_body_entered(body: Node) -> void:
	if body.has_method("take_damage"):
		body.call("take_damage", 2 if hot else 1, global_position.x)
	if kill_zone and body.has_method("respawn"):
		body.call_deferred("respawn")

func _draw() -> void:
	var c := Color("ff4938") if hot else Color("70f9ee")
	var left := -zone_size.x * 0.5
	var bottom := zone_size.y * 0.5
	var points := PackedVector2Array()
	var teeth := maxi(2, int(zone_size.x / 24.0))
	for i in range(teeth + 1):
		var x := left + float(i) * zone_size.x / float(teeth)
		points.append(Vector2(x, bottom))
		points.append(Vector2(x + zone_size.x / float(teeth) * 0.5, -bottom))
	draw_colored_polygon(points, Color(c, 0.88))
