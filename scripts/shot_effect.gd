extends Node2D
## One-shot muzzle / impact animation sourced from the exact same projectile sheet.
const Sheet16 = preload("res://scripts/sprite_sheet_16.gd")

var family: String = ""
var shot_id: int = -1
var first_frame: int = 0
var last_frame: int = 3
var fps: float = 18.0
var direction: Vector2 = Vector2.RIGHT
var display_height: float = 64.0
var lifetime: float = 0.3
var sprite

func _ready() -> void:
	var path = Sheet16.find_path("projectiles", family)
	if path.is_empty():
		queue_free()
		return
	sprite = Sheet16.new()
	add_child(sprite)
	if not sprite.load_sheet(path, display_height, false):
		queue_free()
		return
	sprite.rotation = direction.angle()
	sprite.play_clip("shot_fx_%d_%d" % [first_frame, last_frame], first_frame, last_frame, fps, false, true)
	var frame_count = maxi(1, last_frame - first_frame + 1)
	lifetime = float(frame_count) / maxf(fps, 0.01) + 0.03

func _process(delta: float) -> void:
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()
