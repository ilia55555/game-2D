extends Sprite2D
class_name SpriteSheet16
## Runtime helper for transparent 4x4 / 16-frame pixel sprite sheets.
## Gameplay owns state and timing; this node only renders the selected clip.

const GRID: int = 4
const MAX_FRAME: int = 15

var cell_size: Vector2 = Vector2.ZERO
var clip_key: String = ""
var clip_start: int = 0
var clip_end: int = 0
var clip_fps: float = 8.0
var clip_loop: bool = true
var clip_clock: float = 0.0
var clip_finished: bool = false
var loaded_path: String = ""

static func find_path(category: String, name: String) -> String:
	var roots: Array[String] = []
	match category:
		"hero":
			roots = [
				"res://assets/art/hero/%s_16.png" % name,
				"res://assets/art/hero/%s.png" % name
			]
		"enemies":
			roots = [
				"res://assets/art/enemies/%s_16.png" % name,
				"res://assets/art/enemies/%s.png" % name
			]
		"bosses":
			roots = [
				"res://assets/art/bosses/%s_16.png" % name,
				"res://assets/art/bosses/%s.png" % name
			]
		"projectiles":
			roots = [
				"res://assets/art/projectiles/%s_16.png" % name,
				"res://assets/art/projectiles/%s.png" % name
			]
	for path in roots:
		if ResourceLoader.exists(path):
			return path
	return ""

func load_sheet(path: String, display_height: float = 0.0, ground_anchor: bool = false) -> bool:
	if path.is_empty() or not ResourceLoader.exists(path):
		return false
	var resource = load(path)
	if not resource is Texture2D:
		return false
	var tex: Texture2D = resource
	if tex.get_width() <= 0 or tex.get_height() <= 0:
		return false
	if tex.get_width() % GRID != 0 or tex.get_height() % GRID != 0:
		push_error("16-frame sheet must be divisible by 4: " + path)
		return false
	texture = tex
	hframes = GRID
	vframes = GRID
	frame = 0
	centered = true
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	cell_size = Vector2(float(tex.get_width()) / GRID, float(tex.get_height()) / GRID)
	if display_height > 0.0 and cell_size.y > 0.0:
		scale = Vector2.ONE * (display_height / cell_size.y)
	if ground_anchor:
		position.y = -cell_size.y * scale.y * 0.5
	loaded_path = path
	return true

func play_clip(key: String, first: int, last: int, fps: float = 8.0, loop: bool = true, restart: bool = false) -> void:
	first = clampi(first, 0, MAX_FRAME)
	last = clampi(last, first, MAX_FRAME)
	if not restart and clip_key == key and clip_start == first and clip_end == last and is_equal_approx(clip_fps, fps) and clip_loop == loop:
		return
	clip_key = key
	clip_start = first
	clip_end = last
	clip_fps = maxf(0.01, fps)
	clip_loop = loop
	clip_clock = 0.0
	clip_finished = false
	frame = clip_start

func _process(delta: float) -> void:
	if texture == null or clip_finished or clip_start == clip_end:
		return
	clip_clock += delta
	var count = clip_end - clip_start + 1
	var step = int(floor(clip_clock * clip_fps))
	if clip_loop:
		frame = clip_start + (step % count)
	else:
		if step >= count:
			frame = clip_end
			clip_finished = true
		else:
			frame = clip_start + step
