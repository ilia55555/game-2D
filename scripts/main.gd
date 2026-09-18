extends Node2D

var player: Player
var hud_health: Label
var hud_coins: Label
var info_label: Label

func _ready() -> void:
	RenderingServer.set_default_clear_color(Color("11162d"))
	build_level()
	build_player()
	build_camera()
	build_hud()

func build_level() -> void:
	add_platform(Vector2(480, 510), Vector2(1100, 60), Color("25345f"))
	add_platform(Vector2(295, 405), Vector2(210, 28), Color("324b78"))
	add_platform(Vector2(610, 350), Vector2(230, 28), Color("324b78"))
	add_platform(Vector2(870, 285), Vector2(170, 28), Color("324b78"))
	add_platform(Vector2(1120, 420), Vector2(220, 28), Color("324b78"))
	add_platform(Vector2(1430, 340), Vector2(250, 28), Color("324b78"))
	add_platform(Vector2(1740, 450), Vector2(300, 60), Color("25345f"))

	for p in [Vector2(275,365), Vector2(330,365), Vector2(580,310), Vector2(650,310), Vector2(845,245), Vector2(1130,380), Vector2(1400,300), Vector2(1470,300), Vector2(1760,410)]:
		var coin := CoinPickup.new()
		coin.position = p
		add_child(coin)

	for p in [Vector2(720,470), Vector2(1190,380), Vector2(1500,300)]:
		var enemy := PatrolEnemy.new()
		enemy.position = p
		add_child(enemy)

	var finish := Area2D.new()
	finish.position = Vector2(1860, 390)
	var finish_shape := CollisionShape2D.new()
	var finish_rect := RectangleShape2D.new()
	finish_rect.size = Vector2(48, 100)
	finish_shape.shape = finish_rect
	finish.add_child(finish_shape)
	finish.collision_layer = 0
	finish.collision_mask = 1
	finish.body_entered.connect(_on_finish_body_entered)
	add_child(finish)

	var flag := Polygon2D.new()
	flag.polygon = PackedVector2Array([Vector2(0,40), Vector2(5,40), Vector2(5,-50), Vector2(40,-35), Vector2(5,-20)])
	flag.color = Color("ff5c8a")
	finish.add_child(flag)

func add_platform(center: Vector2, size: Vector2, color: Color) -> void:
	var body := StaticBody2D.new()
	body.position = center
	body.collision_layer = 2
	body.collision_mask = 1 | 4

	var shape_node := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = size
	shape_node.shape = shape
	body.add_child(shape_node)

	var visual := Polygon2D.new()
	visual.polygon = PackedVector2Array([
		Vector2(-size.x/2,-size.y/2), Vector2(size.x/2,-size.y/2),
		Vector2(size.x/2,size.y/2), Vector2(-size.x/2,size.y/2)
	])
	visual.color = color
	body.add_child(visual)
	add_child(body)

func build_player() -> void:
	player = Player.new()
	player.position = Vector2(110, 450)
	player.bullet_scene_owner = self
	player.health_changed.connect(_on_health_changed)
	player.coins_changed.connect(_on_coins_changed)
	add_child(player)

func build_camera() -> void:
	var camera := Camera2D.new()
	camera.position = Vector2(120, -30)
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 7.0
	camera.limit_left = 0
	camera.limit_right = 1980
	camera.limit_top = 0
	camera.limit_bottom = 540
	player.add_child(camera)
	camera.make_current()

func build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)

	var panel := ColorRect.new()
	panel.position = Vector2(16, 16)
	panel.size = Vector2(265, 74)
	panel.color = Color(0.03, 0.05, 0.12, 0.80)
	layer.add_child(panel)

	hud_health = Label.new()
	hud_health.position = Vector2(30, 27)
	hud_health.add_theme_font_size_override("font_size", 22)
	hud_health.text = "ENERGY: 5"
	layer.add_child(hud_health)

	hud_coins = Label.new()
	hud_coins.position = Vector2(30, 55)
	hud_coins.add_theme_font_size_override("font_size", 18)
	hud_coins.text = "ORBS: 0"
	layer.add_child(hud_coins)

	info_label = Label.new()
	info_label.position = Vector2(310, 22)
	info_label.size = Vector2(500, 70)
	info_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	info_label.add_theme_font_size_override("font_size", 17)
	info_label.text = "A/D or arrows move   SHIFT run   SPACE jump   J shoot"
	layer.add_child(info_label)

	build_touch_controls(layer)

func build_touch_controls(layer: CanvasLayer) -> void:
	var left := make_touch_button("<", Vector2(28, 430), Vector2(76, 76))
	var right := make_touch_button(">", Vector2(112, 430), Vector2(76, 76))
	var run := make_touch_button("RUN", Vector2(670, 444), Vector2(82, 58))
	var shoot := make_touch_button("FIRE", Vector2(764, 430), Vector2(82, 72))
	var jump := make_touch_button("JUMP", Vector2(856, 414), Vector2(88, 88))
	layer.add_child(left)
	layer.add_child(right)
	layer.add_child(run)
	layer.add_child(shoot)
	layer.add_child(jump)
	bind_touch(left, "left")
	bind_touch(right, "right")
	bind_touch(run, "run")
	bind_touch(shoot, "shoot")
	bind_touch(jump, "jump")

func make_touch_button(text: String, pos: Vector2, size: Vector2) -> Button:
	var b := Button.new()
	b.text = text
	b.position = pos
	b.size = size
	b.modulate = Color(1,1,1,0.58)
	b.add_theme_font_size_override("font_size", 18)
	return b

func bind_touch(button: Button, action: String) -> void:
	button.button_down.connect(func(): player.set_touch_state(action, true))
	button.button_up.connect(func(): player.set_touch_state(action, false))

func spawn_bullet(pos: Vector2, dir: float) -> void:
	var bullet := Bullet.new()
	bullet.global_position = pos
	bullet.direction = dir
	add_child(bullet)

func _on_health_changed(value: int) -> void:
	hud_health.text = "ENERGY: %d" % value

func _on_coins_changed(value: int) -> void:
	hud_coins.text = "ORBS: %d" % value

func _on_finish_body_entered(body: Node) -> void:
	if body == player:
		info_label.text = "PROTOTYPE COMPLETE - movement, combat, pickups and mobile controls work."
