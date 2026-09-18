extends Node2D

const WORLD_WIDTH := 27600.0
const FLOOR_Y := 680.0

const PlayerScript = preload("res://scripts/player.gd")
const EnemyScript = preload("res://scripts/enemy.gd")
const BulletScript = preload("res://scripts/bullet.gd")
const CoinScript = preload("res://scripts/coin.gd")
const EnemyBulletScript = preload("res://scripts/enemy_bullet.gd")
const BossScript = preload("res://scripts/boss.gd")
const CheckpointScript = preload("res://scripts/checkpoint.gd")
const HazardScript = preload("res://scripts/hazard.gd")
const EnvironmentScript = preload("res://scripts/environment.gd")

var player
var boss
var hud_health: Label
var hud_coins: Label
var hud_enemies: Label
var info_label: Label
var stage_progress: ProgressBar
var boss_panel: ColorRect
var boss_health_bar: ProgressBar
var boss_health_label: Label
var touch_buttons: Array[Button] = []

var gates := {}
var section_remaining := {0: 4, 1: 4, 2: 4, 3: 4, 4: 4}
var total_small_enemies := 20
var defeated_small_enemies := 0
var boss_started := false
var stage_complete := false

func _ready() -> void:
	RenderingServer.set_default_clear_color(Color("071722"))
	build_environment()
	build_stage_geometry()
	build_decorations()
	build_collectibles()
	build_hazards_and_movement_tools()
	build_gates_and_checkpoints()
	build_enemies()
	build_boss()
	build_player()
	build_camera()
	build_hud()
	build_boss_trigger()

func _process(_delta: float) -> void:
	if player != null and stage_progress != null:
		stage_progress.value = clampf(player.global_position.x / WORLD_WIDTH * 100.0, 0.0, 100.0)

func build_environment() -> void:
	var backdrop = EnvironmentScript.new()
	backdrop.setup(WORLD_WIDTH)
	add_child(backdrop)

func build_stage_geometry() -> void:
	# بخش ۱: معرفی جنگل و حرکت پایه
	add_floor(0, 1300)
	add_floor(1360, 1900)
	add_floor(1980, 2700)
	add_floor(2790, 3600)
	add_floor(3690, 4550)
	add_floor(4630, 5240)
	add_platform(Vector2(1120, 525), Vector2(340, 30))
	add_platform(Vector2(2400, 500), Vector2(380, 30))
	add_platform(Vector2(3440, 440), Vector2(340, 30))
	add_platform(Vector2(4470, 520), Vector2(340, 30))

	# بخش ۲: مسیر سرعت
	add_floor(5260, 6150)
	add_floor(6240, 7200)
	add_floor(7320, 8200)
	add_floor(8350, 9300)
	add_floor(9430, 10520)
	add_platform(Vector2(6660, 505), Vector2(420, 28))
	add_platform(Vector2(7800, 455), Vector2(420, 28))
	add_platform(Vector2(8970, 520), Vector2(450, 28))
	add_platform(Vector2(10040, 470), Vector2(340, 28))

	# بخش ۳: خرابه‌های عمودی
	add_floor(10540, 11340)
	add_floor(15180, 15840)
	add_platform(Vector2(11520, 580), Vector2(390, 32))
	add_platform(Vector2(12020, 500), Vector2(340, 32))
	add_platform(Vector2(12510, 420), Vector2(340, 32))
	add_platform(Vector2(13010, 335), Vector2(350, 32))
	add_platform(Vector2(13520, 250), Vector2(360, 32))
	add_platform(Vector2(14060, 335), Vector2(380, 32))
	add_platform(Vector2(14540, 445), Vector2(360, 32))
	add_platform(Vector2(14960, 560), Vector2(360, 32))

	# بخش ۴: گانتلت جنگی
	add_floor(15860, 16980, true)
	add_floor(17060, 18100, true)
	add_floor(18210, 19300, true)
	add_floor(19400, 20440, true)
	add_floor(20520, 21040, true)
	add_platform(Vector2(16450, 500), Vector2(380, 30), true)
	add_platform(Vector2(17540, 430), Vector2(440, 30), true)
	add_platform(Vector2(18740, 520), Vector2(420, 30), true)
	add_platform(Vector2(19900, 420), Vector2(420, 30), true)

	# بخش ۵: نزدیک شدن به منطقه‌ی فاسد
	add_floor(21060, 21900, true)
	add_floor(22020, 22900, true)
	add_floor(23030, 23730, true)
	add_floor(23830, 24500, true)
	add_platform(Vector2(21540, 485), Vector2(390, 30), true)
	add_platform(Vector2(22510, 410), Vector2(420, 30), true)
	add_platform(Vector2(23440, 485), Vector2(360, 30), true)
	add_platform(Vector2(24120, 400), Vector2(300, 30), true)

	# آرنای VARKON
	add_floor(24520, 27600, true)
	add_platform(Vector2(25300, 480), Vector2(320, 28), true)
	add_platform(Vector2(26820, 470), Vector2(340, 28), true)

func add_floor(start_x: float, end_x: float, corrupted: bool = false) -> void:
	add_platform(
		Vector2((start_x + end_x) * 0.5, FLOOR_Y),
		Vector2(end_x - start_x, 100),
		corrupted
	)

func add_platform(center: Vector2, size: Vector2, corrupted: bool = false) -> void:
	var body := StaticBody2D.new()
	body.position = center
	body.collision_layer = 2
	body.collision_mask = 1 | 4

	var shape_node := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = size
	shape_node.shape = shape
	body.add_child(shape_node)

	var shadow := Polygon2D.new()
	shadow.polygon = rectangle_points(size + Vector2(10, 12))
	shadow.position = Vector2(7, 9)
	shadow.color = Color(0.01, 0.02, 0.025, 0.55)
	body.add_child(shadow)

	var base := Polygon2D.new()
	base.polygon = rectangle_points(size)
	base.color = Color("302b31") if corrupted else Color("283e43")
	body.add_child(base)

	var top := Polygon2D.new()
	top.polygon = rectangle_points(Vector2(size.x, mini(14.0, size.y)))
	top.position = Vector2(0, -size.y * 0.5 + mini(7.0, size.y * 0.5))
	top.color = Color("b24b35") if corrupted else Color("4f8860")
	body.add_child(top)

	var glow := Polygon2D.new()
	glow.polygon = rectangle_points(Vector2(minf(size.x * 0.72, 260.0), 4))
	glow.position = Vector2(0, -size.y * 0.5 + 15)
	glow.color = Color(1.0, 0.24, 0.16, 0.42) if corrupted else Color(0.24, 1.0, 0.92, 0.35)
	body.add_child(glow)

	add_child(body)

func rectangle_points(size: Vector2) -> PackedVector2Array:
	return PackedVector2Array([
		Vector2(-size.x * 0.5, -size.y * 0.5),
		Vector2(size.x * 0.5, -size.y * 0.5),
		Vector2(size.x * 0.5, size.y * 0.5),
		Vector2(-size.x * 0.5, size.y * 0.5)
	])

func build_decorations() -> void:
	for x in range(500, 18500, 1150):
		add_crystal(Vector2(float(x), 615), Color("52fff1"))
	for x in range(18800, 27400, 850):
		add_crystal(Vector2(float(x), 615), Color("ff563e"))

	add_ruin_pillar(Vector2(3250, 600), 230, false)
	add_ruin_pillar(Vector2(8450, 600), 260, false)
	add_ruin_pillar(Vector2(12950, 610), 390, false)
	add_ruin_pillar(Vector2(14300, 610), 300, false)
	add_ruin_pillar(Vector2(17850, 600), 270, true)
	add_ruin_pillar(Vector2(21900, 600), 330, true)
	add_ruin_pillar(Vector2(25800, 600), 420, true)
	add_ruin_pillar(Vector2(27200, 600), 460, true)

func add_crystal(pos: Vector2, color: Color) -> void:
	var node := Node2D.new()
	node.position = pos
	var outer := Polygon2D.new()
	outer.polygon = PackedVector2Array([
		Vector2(-24, 0), Vector2(0, -64), Vector2(24, 0), Vector2(0, 20)
	])
	outer.color = Color(color, 0.16)
	node.add_child(outer)
	var core := Polygon2D.new()
	core.polygon = PackedVector2Array([
		Vector2(-11, 0), Vector2(0, -46), Vector2(11, 0), Vector2(0, 9)
	])
	core.color = color
	node.add_child(core)
	add_child(node)

func add_ruin_pillar(pos: Vector2, height: float, corrupted: bool) -> void:
	var node := Node2D.new()
	node.position = pos
	node.z_index = -2
	var body := Polygon2D.new()
	body.polygon = rectangle_points(Vector2(90, height))
	body.position = Vector2(0, -height * 0.5)
	body.color = Color("352e31") if corrupted else Color("344b4d")
	node.add_child(body)
	var rune := Polygon2D.new()
	rune.polygon = rectangle_points(Vector2(12, height * 0.62))
	rune.position = Vector2(0, -height * 0.5)
	rune.color = Color(1.0, 0.22, 0.15, 0.55) if corrupted else Color(0.28, 1.0, 0.92, 0.52)
	node.add_child(rune)
	add_child(node)

func build_collectibles() -> void:
	# خط اصلی آیتم‌ها
	for x in range(420, 10500, 420):
		spawn_orb(Vector2(float(x), 535.0 - sin(float(x) * 0.012) * 55.0))
	# مسیر عمودی
	var vertical_orbs := [
		Vector2(11480, 530), Vector2(12000, 445), Vector2(12490, 365),
		Vector2(12990, 280), Vector2(13510, 195), Vector2(14040, 280),
		Vector2(14520, 390), Vector2(14950, 505)
	]
	for pos in vertical_orbs:
		spawn_orb(pos)
	# نیمه‌ی فاسد
	for x in range(16000, 24400, 480):
		spawn_orb(Vector2(float(x), 520.0 - sin(float(x) * 0.009) * 70.0))

func spawn_orb(pos: Vector2) -> void:
	var orb = CoinScript.new()
	orb.position = pos
	add_child(orb)

func build_hazards_and_movement_tools() -> void:
	add_hazard(Vector2(1330, 648), Vector2(60, 34), false)
	add_hazard(Vector2(2750, 648), Vector2(70, 34), false)
	add_hazard(Vector2(7255, 648), Vector2(105, 34), false)
	add_hazard(Vector2(8265, 648), Vector2(120, 34), false)
	add_hazard(Vector2(18155, 648), Vector2(95, 34), true)
	add_hazard(Vector2(19350, 648), Vector2(90, 34), true)
	add_hazard(Vector2(21960, 648), Vector2(100, 34), true)
	add_hazard(Vector2(22965, 648), Vector2(105, 34), true)
	add_hazard(Vector2(23780, 648), Vector2(90, 34), true)

	add_speed_pad(Vector2(5660, 620), 790.0)
	add_speed_pad(Vector2(6420, 620), 820.0)
	add_speed_pad(Vector2(7520, 620), 850.0)
	add_speed_pad(Vector2(8620, 620), 870.0)
	add_speed_pad(Vector2(9630, 620), 820.0)

	add_spring(Vector2(11300, 615), 820.0)
	add_spring(Vector2(11830, 548), 760.0)
	add_spring(Vector2(13730, 285), 730.0)
	add_spring(Vector2(15100, 615), 800.0)

func add_hazard(pos: Vector2, size: Vector2, corrupted: bool) -> void:
	var hazard = HazardScript.new()
	hazard.configure(size, false, corrupted)
	hazard.position = pos
	add_child(hazard)

func add_speed_pad(pos: Vector2, speed: float) -> void:
	var area := Area2D.new()
	area.position = pos
	area.collision_layer = 0
	area.collision_mask = 1
	var shape_node := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(120, 28)
	shape_node.shape = shape
	area.add_child(shape_node)
	var visual := Polygon2D.new()
	visual.polygon = PackedVector2Array([
		Vector2(-60, 12), Vector2(34, 12), Vector2(60, 0),
		Vector2(34, -12), Vector2(-60, -12), Vector2(-34, 0)
	])
	visual.color = Color("4bfff0")
	area.add_child(visual)
	area.body_entered.connect(func(body: Node):
		if body.has_method("boost_horizontal"):
			body.call("boost_horizontal", speed, 1.0)
	)
	add_child(area)

func add_spring(pos: Vector2, power: float) -> void:
	var area := Area2D.new()
	area.position = pos
	area.collision_layer = 0
	area.collision_mask = 1
	var shape_node := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(72, 32)
	shape_node.shape = shape
	area.add_child(shape_node)
	var visual := Polygon2D.new()
	visual.polygon = PackedVector2Array([
		Vector2(-34, 14), Vector2(-22, -13), Vector2(0, 4),
		Vector2(22, -13), Vector2(34, 14)
	])
	visual.color = Color("ffd94f")
	area.add_child(visual)
	area.body_entered.connect(func(body: Node):
		if body.has_method("spring"):
			body.call("spring", power)
	)
	add_child(area)

func build_gates_and_checkpoints() -> void:
	add_energy_gate(5200, 0, false)
	add_energy_gate(10500, 1, false)
	add_energy_gate(15820, 2, false)
	add_energy_gate(21020, 3, true)
	add_energy_gate(24480, 4, true)

	add_checkpoint(Vector2(5350, 610), 1)
	add_checkpoint(Vector2(10640, 610), 2)
	add_checkpoint(Vector2(15970, 610), 3)
	add_checkpoint(Vector2(21160, 610), 4)
	add_checkpoint(Vector2(24620, 610), 5)

func add_energy_gate(x: float, section: int, corrupted: bool) -> void:
	var gate := StaticBody2D.new()
	gate.position = Vector2(x, 385)
	gate.collision_layer = 2
	gate.collision_mask = 1

	var shape_node := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(34, 490)
	shape_node.shape = shape
	gate.add_child(shape_node)

	var outer := Polygon2D.new()
	outer.polygon = rectangle_points(Vector2(44, 500))
	outer.color = Color(1.0, 0.15, 0.10, 0.18) if corrupted else Color(0.25, 1.0, 0.94, 0.18)
	gate.add_child(outer)
	var beam := Polygon2D.new()
	beam.polygon = rectangle_points(Vector2(12, 480))
	beam.color = Color("ff4938") if corrupted else Color("52fff1")
	gate.add_child(beam)

	gates[section] = gate
	add_child(gate)

func add_checkpoint(pos: Vector2, index: int) -> void:
	var checkpoint = CheckpointScript.new()
	checkpoint.position = pos
	checkpoint.checkpoint_index = index
	add_child(checkpoint)

func build_enemies() -> void:
	var configs := [
		[Vector2(820, 595), "ground", 0],
		[Vector2(1570, 440), "fly", 0],
		[Vector2(3100, 595), "ground", 0],
		[Vector2(4470, 430), "fly", 0],

		[Vector2(5900, 595), "ground", 1],
		[Vector2(6820, 420), "fly", 1],
		[Vector2(7900, 595), "ground", 1],
		[Vector2(9680, 415), "fly", 1],

		[Vector2(11020, 595), "ground", 2],
		[Vector2(12250, 350), "fly", 2],
		[Vector2(13520, 200), "ground", 2],
		[Vector2(14780, 390), "fly", 2],

		[Vector2(16350, 595), "ground", 3],
		[Vector2(17550, 365), "fly", 3],
		[Vector2(18800, 595), "ground", 3],
		[Vector2(20120, 360), "fly", 3],

		[Vector2(21460, 595), "ground", 4],
		[Vector2(22480, 355), "fly", 4],
		[Vector2(23340, 595), "ground", 4],
		[Vector2(24080, 345), "fly", 4]
	]

	assert(configs.size() == 20)

	for i in range(configs.size()):
		var data: Array = configs[i]
		var enemy = EnemyScript.new()
		enemy.position = data[0]
		enemy.configure(data[1], int(data[2]), i + 1)
		enemy.defeated.connect(_on_small_enemy_defeated)
		add_child(enemy)

func _on_small_enemy_defeated(section: int) -> void:
	defeated_small_enemies += 1
	section_remaining[section] = maxi(0, int(section_remaining[section]) - 1)
	if hud_enemies:
		hud_enemies.text = "ENEMIES  %d / 20" % defeated_small_enemies
	if int(section_remaining[section]) == 0:
		open_gate(section)

func open_gate(section: int) -> void:
	if not gates.has(section):
		return
	var gate: Node = gates[section]
	gates.erase(section)
	if gate == null:
		return
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(gate, "modulate:a", 0.0, 0.42)
	tween.tween_property(gate, "scale:y", 0.05, 0.42)
	tween.chain().tween_callback(gate.queue_free)
	if info_label:
		info_label.text = "SECTOR CLEARED  •  GATE OPEN"

func build_boss() -> void:
	boss = BossScript.new()
	boss.position = Vector2(26550, 535)
	boss.health_changed.connect(_on_boss_health_changed)
	boss.defeated.connect(_on_boss_defeated)
	add_child(boss)

func build_boss_trigger() -> void:
	var trigger := Area2D.new()
	trigger.position = Vector2(24920, 390)
	trigger.collision_layer = 0
	trigger.collision_mask = 1
	var shape_node := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(220, 520)
	shape_node.shape = shape
	trigger.add_child(shape_node)
	trigger.body_entered.connect(_on_boss_trigger_entered)
	add_child(trigger)

func _on_boss_trigger_entered(body: Node) -> void:
	if boss_started or body != player:
		return
	boss_started = true
	boss.activate()
	boss_panel.visible = true
	info_label.text = "VARKON  •  FINAL GUARDIAN"

func _on_boss_health_changed(current: int, maximum: int) -> void:
	if boss_health_bar:
		boss_health_bar.value = float(current) / float(maximum) * 100.0
	if boss_health_label:
		boss_health_label.text = "VARKON  %d / %d" % [current, maximum]

func _on_boss_defeated() -> void:
	stage_complete = true
	if boss_panel:
		boss_panel.visible = false
	info_label.text = "VARKON DEFEATED  •  STAGE COMPLETE"
	show_stage_complete()

func build_player() -> void:
	player = PlayerScript.new()
	player.position = Vector2(170, 585)
	player.bullet_scene_owner = self
	player.health_changed.connect(_on_health_changed)
	player.coins_changed.connect(_on_coins_changed)
	add_child(player)

func build_camera() -> void:
	var camera := Camera2D.new()
	camera.position = Vector2(170, -35)
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 8.5
	camera.limit_left = 0
	camera.limit_right = int(WORLD_WIDTH)
	camera.limit_top = -60
	camera.limit_bottom = 780
	player.add_child(camera)
	camera.make_current()

func spawn_bullet(pos: Vector2, dir: float) -> void:
	var bullet = BulletScript.new()
	bullet.global_position = pos
	bullet.direction = dir
	add_child(bullet)

func spawn_enemy_bullet(pos: Vector2, dir: Vector2, speed: float = 320.0) -> void:
	var projectile = EnemyBulletScript.new()
	projectile.global_position = pos
	projectile.velocity = dir.normalized() * speed
	add_child(projectile)

func build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)

	var top_panel := ColorRect.new()
	top_panel.position = Vector2(20, 18)
	top_panel.size = Vector2(350, 100)
	top_panel.color = Color(0.015, 0.035, 0.06, 0.88)
	layer.add_child(top_panel)

	var title := Label.new()
	title.position = Vector2(36, 27)
	title.text = "JUNGLE RUINS  /  STAGE 01"
	title.add_theme_font_size_override("font_size", 17)
	title.modulate = Color("82fff5")
	layer.add_child(title)

	hud_health = Label.new()
	hud_health.position = Vector2(36, 55)
	hud_health.text = "ENERGY  8 / 8"
	hud_health.add_theme_font_size_override("font_size", 20)
	layer.add_child(hud_health)

	hud_coins = Label.new()
	hud_coins.position = Vector2(200, 58)
	hud_coins.text = "ORBS  0"
	hud_coins.add_theme_font_size_override("font_size", 17)
	layer.add_child(hud_coins)

	hud_enemies = Label.new()
	hud_enemies.position = Vector2(36, 86)
	hud_enemies.text = "ENEMIES  0 / 20"
	hud_enemies.add_theme_font_size_override("font_size", 15)
	hud_enemies.modulate = Color("ffb7a7")
	layer.add_child(hud_enemies)

	info_label = Label.new()
	info_label.position = Vector2(420, 24)
	info_label.size = Vector2(440, 44)
	info_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	info_label.text = "RUN • JUMP • SHOOT • CLEAR EACH SECTOR"
	info_label.add_theme_font_size_override("font_size", 16)
	info_label.modulate = Color("d9fffb")
	layer.add_child(info_label)

	stage_progress = ProgressBar.new()
	stage_progress.position = Vector2(420, 78)
	stage_progress.size = Vector2(440, 14)
	stage_progress.min_value = 0
	stage_progress.max_value = 100
	stage_progress.show_percentage = false
	layer.add_child(stage_progress)

	boss_panel = ColorRect.new()
	boss_panel.position = Vector2(330, 620)
	boss_panel.size = Vector2(620, 70)
	boss_panel.color = Color(0.08, 0.01, 0.015, 0.92)
	boss_panel.visible = false
	layer.add_child(boss_panel)

	boss_health_label = Label.new()
	boss_health_label.position = Vector2(350, 628)
	boss_health_label.size = Vector2(580, 24)
	boss_health_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	boss_health_label.text = "VARKON"
	boss_health_label.add_theme_font_size_override("font_size", 17)
	boss_health_label.modulate = Color("ff8d72")
	layer.add_child(boss_health_label)
	boss_health_label.visible = false

	boss_health_bar = ProgressBar.new()
	boss_health_bar.position = Vector2(355, 658)
	boss_health_bar.size = Vector2(570, 18)
	boss_health_bar.min_value = 0
	boss_health_bar.max_value = 100
	boss_health_bar.value = 100
	boss_health_bar.show_percentage = false
	layer.add_child(boss_health_bar)
	boss_health_bar.visible = false

	boss_panel.visibility_changed.connect(func():
		boss_health_label.visible = boss_panel.visible
		boss_health_bar.visible = boss_panel.visible
	)

	build_touch_controls(layer)

func build_touch_controls(layer: CanvasLayer) -> void:
	var left := make_touch_button("<", Vector2(30, 610), Vector2(78, 78))
	var right := make_touch_button(">", Vector2(118, 610), Vector2(78, 78))
	var run := make_touch_button("RUN", Vector2(960, 625), Vector2(84, 60))
	var shoot := make_touch_button("FIRE", Vector2(1054, 610), Vector2(88, 78))
	var jump := make_touch_button("JUMP", Vector2(1152, 594), Vector2(96, 94))
	for b in [left, right, run, shoot, jump]:
		layer.add_child(b)
		touch_buttons.append(b)
	bind_touch(left, "left")
	bind_touch(right, "right")
	bind_touch(run, "run")
	bind_touch(shoot, "shoot")
	bind_touch(jump, "jump")

	var show_touch := DisplayServer.is_touchscreen_available()
	for button in touch_buttons:
		button.visible = show_touch

func make_touch_button(text: String, pos: Vector2, size: Vector2) -> Button:
	var button := Button.new()
	button.text = text
	button.position = pos
	button.size = size
	button.modulate = Color(1, 1, 1, 0.62)
	button.add_theme_font_size_override("font_size", 18)
	return button

func bind_touch(button: Button, action: String) -> void:
	button.button_down.connect(func(): player.set_touch_state(action, true))
	button.button_up.connect(func(): player.set_touch_state(action, false))

func _on_health_changed(value: int) -> void:
	if hud_health:
		hud_health.text = "ENERGY  %d / 8" % value

func _on_coins_changed(value: int) -> void:
	if hud_coins:
		hud_coins.text = "ORBS  %d" % value

func show_stage_complete() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 20
	add_child(layer)
	var shade := ColorRect.new()
	shade.position = Vector2(0, 0)
	shade.size = Vector2(1280, 720)
	shade.color = Color(0.01, 0.05, 0.07, 0.72)
	layer.add_child(shade)
	var panel := ColorRect.new()
	panel.position = Vector2(310, 250)
	panel.size = Vector2(660, 210)
	panel.color = Color(0.02, 0.10, 0.12, 0.96)
	layer.add_child(panel)
	var label := Label.new()
	label.position = Vector2(330, 285)
	label.size = Vector2(620, 140)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.text = "STAGE COMPLETE\nVARKON DEFEATED\n\nORBS: %d   •   ENEMIES: %d / 20" % [player.coins, defeated_small_enemies]
	label.add_theme_font_size_override("font_size", 28)
	label.modulate = Color("7ffff1")
	layer.add_child(label)
