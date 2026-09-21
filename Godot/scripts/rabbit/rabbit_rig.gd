@tool
extends Node2D
class_name RabbitRig
## Registered-canvas cutout renderer. Every PNG keeps the same canvas and origin,
## so animation can never open seams between body pieces.

enum Motion { IDLE, RUN, JUMP, FALL, SHOOT }

const PARTS_DIR := "res://assets/rabbit/parts"
const PART_NAMES: PackedStringArray = [
	"frame_03", # back ear
	"frame_06", # back upper arm
	"frame_09", # back forearm / hand
	"frame_11", # back thigh
	"frame_12", # back shin
	"frame_13", # back shoe
	"frame_05", # torso
	"frame_04", # hair
	"frame_01", # head
	"frame_02", # front ear
	"frame_14", # front thigh
	"frame_15", # front shin
	"frame_16", # front shoe
	"frame_08", # front upper arm
	"frame_07", # front forearm / hand
	"frame_10", # gun
]

static func assets_available() -> bool:
	for index in range(1, 17):
		if not ResourceLoader.exists("%s/frame_%02d.png" % [PARTS_DIR, index]):
			return false
	return true

@export var preview_motion: Motion = Motion.IDLE:
	set(value):
		preview_motion = value
		if Engine.is_editor_hint():
			motion = value
@export_range(32.0, 1024.0, 1.0) var display_height := 240.0
@export_range(1.0, 30.0, 0.5) var run_cycles_per_second := 7.5
@export var facing_left := false

var motion: Motion = Motion.IDLE
var velocity := Vector2.ZERO
var _clock := 0.0
var _canvas_size := Vector2.ZERO
var _ready_for_animation := false
var _visual: CanvasGroup
var _missing_label: Label

func _ready() -> void:
	_build_registered_composite()
	set_process(true)

func _build_registered_composite() -> void:
	for child in get_children():
		child.queue_free()
	_visual = CanvasGroup.new()
	_visual.name = "UnifiedRabbit"
	add_child(_visual)

	var expected_size := Vector2i.ZERO
	var missing: PackedStringArray = []
	var invalid: PackedStringArray = []
	for part_name in PART_NAMES:
		var path := "%s/%s.png" % [PARTS_DIR, part_name]
		if not ResourceLoader.exists(path):
			missing.append(part_name + ".png")
			continue
		var texture := load(path) as Texture2D
		if texture == null:
			invalid.append(part_name + ".png")
			continue
		var size := texture.get_size()
		if expected_size == Vector2i.ZERO:
			expected_size = Vector2i(size)
		elif Vector2i(size) != expected_size:
			invalid.append("%s.png (%dx%d)" % [part_name, int(size.x), int(size.y)])
			continue
		var sprite := Sprite2D.new()
		sprite.name = part_name
		sprite.texture = texture
		sprite.centered = true
		sprite.position = Vector2.ZERO
		sprite.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
		_visual.add_child(sprite)

	_ready_for_animation = missing.is_empty() and invalid.is_empty() and expected_size != Vector2i.ZERO
	if _ready_for_animation:
		_canvas_size = Vector2(expected_size)
		_visual.scale = Vector2.ONE * (display_height / maxf(1.0, _canvas_size.y))
		return

	_visual.visible = false
	_missing_label = Label.new()
	_missing_label.name = "AssetInstructions"
	_missing_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_missing_label.position = Vector2(-310, -80)
	_missing_label.size = Vector2(620, 160)
	_missing_label.text = "Rabbit rig is waiting for 16 registered PNG files.\nPut frame_01.png … frame_16.png in:\nGodot/assets/rabbit/parts/\n\nAll files must have exactly the same canvas size and origin."
	if not invalid.is_empty():
		_missing_label.text += "\nMismatched/unreadable: " + ", ".join(invalid)
	add_child(_missing_label)

func set_motion(next_motion: Motion, character_velocity := Vector2.ZERO, look_left := false) -> void:
	motion = next_motion
	velocity = character_velocity
	facing_left = look_left

func _process(delta: float) -> void:
	if not _ready_for_animation:
		return
	_clock += delta
	var phase := _clock * TAU * run_cycles_per_second
	var offset := Vector2.ZERO
	var angle := 0.0
	var squash := Vector2.ONE
	match motion:
		Motion.IDLE:
			offset.y = sin(_clock * 2.8) * 2.0
			angle = sin(_clock * 1.4) * 0.008
		Motion.RUN:
			offset.x = sin(phase) * 1.4
			offset.y = -absf(sin(phase)) * 5.0
			angle = sin(phase) * 0.025
			squash = Vector2(1.0 + absf(cos(phase)) * 0.025, 1.0 - absf(cos(phase)) * 0.025)
		Motion.JUMP:
			angle = clampf(velocity.y / 2400.0, -0.12, 0.02)
			squash = Vector2(0.94, 1.06)
		Motion.FALL:
			angle = clampf(velocity.y / 3000.0, 0.0, 0.10)
			squash = Vector2(1.04, 0.96)
		Motion.SHOOT:
			offset.x = -4.0 + sin(_clock * 30.0) * 0.8
			angle = -0.018
	_visual.position = offset
	_visual.rotation = angle * (-1.0 if facing_left else 1.0)
	var base_scale := display_height / maxf(1.0, _canvas_size.y)
	_visual.scale = Vector2((-1.0 if facing_left else 1.0) * squash.x, squash.y) * base_scale
