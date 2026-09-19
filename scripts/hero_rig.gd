extends Node2D
## Vector cutout rig: two-bone leg IK, independently aimed weapon, overlapping ears/scarf.
var parts: Dictionary = {}
var clock: float = 0
var stride: float = 0
var speed: float = 0
var vy: float = 0
var grounded: bool = true
var duck: bool = false
var dash: bool = false
var facing: float = 1
var recoil: float = 0
var hurt: float = 0
var landing: float = 0
var victory: bool = false
var dead: bool = false
var aim: float = 0
var color_flash: float = 0

func _ready() -> void:
	# Rear limbs are drawn behind the torso, front limbs and muzzle above it.
	for key in ["tail", "ear_back", "leg_back", "shin_back", "boot_back", "arm_back", "forearm_back", "body", "leg_front", "shin_front", "boot_front", "scarf", "head", "ear_front", "arm_front", "forearm_front", "gun"]:
		var resource = key
		if key.begins_with("ear"): resource = "ear"
		if key.begins_with("leg"): resource = "thigh"
		if key.begins_with("shin"): resource = "shin"
		if key.begins_with("boot"): resource = "boot"
		if key.begins_with("arm"): resource = "upper_arm"
		if key.begins_with("forearm"): resource = "forearm"
		var sprite = Sprite2D.new()
		sprite.texture = load("res://assets/art/hero/" + resource + ".svg")
		sprite.centered = false
		sprite.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
		parts[key] = sprite
		add_child(sprite)
		if key.ends_with("back"): sprite.modulate = Color(0.66, 0.78, 0.84)

func pose(delta: float, move_speed: float, vertical: float, on_ground: bool, crouch: bool, dashing: bool, direction: float) -> void:
	speed = move_speed
	vy = vertical
	grounded = on_ground
	duck = crouch
	dash = dashing
	facing = direction
	clock += delta
	stride += delta * absf(speed) / 34.0
	recoil = maxf(0, recoil - delta * 10)
	landing = maxf(0, landing - delta * 6)
	hurt = maxf(0, hurt - delta * 5)
	color_flash = maxf(0, color_flash - delta * 9)
	modulate = Color(1 + color_flash * 2, 1 + color_flash, 1 + color_flash)
	scale = Vector2(facing * (1 + landing * 0.11), 1 - landing * 0.09)
	if dead:
		rotation = lerp_angle(rotation, -facing * 1.4, minf(delta * 7, 1))
		modulate.a = maxf(0.0, modulate.a - delta)
	animate()

func put(key: String, pos: Vector2, angle: float = 0, origin: Vector2 = Vector2.ZERO, factor: float = 0.65) -> void:
	var node = parts[key]
	node.position = pos
	node.rotation = angle
	node.scale = Vector2.ONE * factor / 3.0
	node.offset = -origin * 3.0

func animate() -> void:
	if parts.is_empty(): return
	var running = clampf(absf(speed) / 480, 0, 1)
	var bob = -absf(sin(stride)) * 3.0 * running if grounded else 0.0
	bob += sin(clock * 2.5) * (1 - running)
	var torso = Vector2(0, -47 + bob + (17 if duck else 0))
	if dash: torso.y += 10
	var lean = 0.10 * running + (0.26 if dash else 0.0) - hurt * 0.15
	put("tail", torso + Vector2(-15, 9), -0.12 + sin(clock * 6 - 0.8) * 0.16 - running * 0.25, Vector2(66, 24), 0.55)
	leg("back", torso + Vector2(-7, 11), stride + PI, running)
	put("arm_back", torso + Vector2(-11, -12), -0.6 + sin(stride) * running * 0.7, Vector2(14, 6), 0.58)
	put("forearm_back", torso + Vector2(-11, 3), -0.8, Vector2(14, 5), 0.58)
	put("body", torso, lean, Vector2(34, 42), 0.68)
	leg("front", torso + Vector2(6, 12), stride, running)
	put("scarf", torso + Vector2(3, -23), sin(clock * 9 - 1) * 0.10 - running * .18, Vector2(83, 12), 0.62)
	var head = torso + Vector2(5, - 30.0)
	var head_angle = -0.04 + sin(clock * 2.2) * 0.025 - lean * 0.35
	put("ear_back", head + Vector2(-9, -19), -0.28 - running * .42 + sin(clock * 4.2 - .6) * .08, Vector2(19, 96), 0.48)
	put("head", head, head_angle, Vector2(49, 53), 0.70)
	put("ear_front", head + Vector2(3, -20), -0.06 - running * .48 + sin(clock * 4.2) * .10, Vector2(19, 96), 0.52)
	var arm = torso + Vector2(10, -9)
	put("arm_front", arm, -0.4 + aim * 0.4, Vector2(14, 5), 0.63)
	put("forearm_front", arm + Vector2(6, 14), -1.45 + aim, Vector2(15, 7), 0.60)
	put("gun", torso + Vector2(15 - recoil * 5, 0), aim - recoil * .07, Vector2( 20.0, 29), 0.63)
	if victory:
		parts.gun.rotation = -0.9
		parts.head.rotation = sin(clock * 4) * .06
	queue_redraw()


func leg(side: String, hip: Vector2, phase: float, amount: float) -> void:
	var foot = Vector2(hip.x + 8, -5)
	if grounded:
		foot.x += cos(phase) * 22 * amount
		foot.y -= maxf(0, sin(phase)) * 20 * amount
	else:
		foot = hip + (Vector2(22, 24) if side == "front" else Vector2(-18, 21))
		if vy > 0: foot.y += 7
	if dash: foot = hip + Vector2(-26 if side == "back" else 10, 16)
	var offset = foot - hip
	var distance = clampf(offset.length(), 4, 42)
	var line = offset.normalized()
	var perpendicular = Vector2(line.y, -line.x)
	var knee = hip + line * distance * 0.5 + perpendicular * sqrt(maxf(0, 23 * 23 - distance * distance * 0.25))
	put("leg_" + side, hip, (knee - hip).angle() - PI / 2, Vector2(16, 7), 0.66)
	put("shin_" + side, knee, (foot - knee).angle() - PI / 2, Vector2(15, 7), 0.61)
	put("boot_" + side, foot, -0.05 if grounded else -0.2, Vector2(16, 23), 0.62)

func _draw() -> void:
	if recoil > .45:
		var center = Vector2(69 - recoil * 4, -47 + (17 if duck else 0))
		var points = PackedVector2Array([center, center + Vector2(15,-12), center + Vector2(12,-3), center + Vector2(31,0), center + Vector2(12,5), center + Vector2(17,13)])
		draw_colored_polygon(points, Color("fff5c0"))
