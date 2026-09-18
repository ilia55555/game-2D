extends Node2D
class_name JungleBackdrop

var world_width := 28000.0

func setup(width: float) -> void:
	world_width = width
	queue_redraw()

func _ready() -> void:
	z_index = -50
	queue_redraw()

func _draw() -> void:
	# آسمان، مه و عمق رنگی
	draw_rect(Rect2(0, -260, world_width, 1250), Color("071722"))
	draw_rect(Rect2(0, 40, world_width, 900), Color("102c3b"))
	draw_rect(Rect2(0, 360, world_width, 620), Color("163d45"))

	# کوه‌های دوردست
	for i in range(int(world_width / 760.0) + 2):
		var x := float(i) * 760.0
		var h := 250.0 + float((i * 73) % 220)
		var tint := Color("173f49") if i % 2 == 0 else Color("1d4c52")
		draw_colored_polygon(PackedVector2Array([
			Vector2(x - 330, 620),
			Vector2(x, 620 - h),
			Vector2(x + 360, 620)
		]), tint)

	# آبشارهای چندلایه
	for x in range(1300, int(world_width), 2500):
		draw_rect(Rect2(float(x), 190, 70, 440), Color(0.38, 0.92, 1.0, 0.12))
		draw_rect(Rect2(float(x) + 13, 190, 42, 440), Color(0.45, 0.95, 1.0, 0.17))
		draw_rect(Rect2(float(x) + 27, 190, 14, 440), Color(0.80, 1.0, 1.0, 0.24))
		draw_circle(Vector2(float(x) + 35, 630), 62, Color(0.55, 0.95, 1.0, 0.08))

	# حلقه‌های فناوری باستانی
	for x in range(2200, int(world_width), 4300):
		var corrupted := x > 18500
		var c := Color("ff4b37") if corrupted else Color("43f1e4")
		draw_arc(Vector2(float(x), 260), 165.0, PI, TAU, 48, Color(c, 0.34), 18.0)
		draw_arc(Vector2(float(x), 260), 124.0, PI, TAU, 40, Color(c, 0.22), 8.0)
		draw_arc(Vector2(float(x), 260), 92.0, PI, TAU, 36, Color(c, 0.14), 4.0)
		draw_line(Vector2(float(x) - 165, 260), Vector2(float(x) - 165, 620), Color(c, 0.20), 20)
		draw_line(Vector2(float(x) + 165, 260), Vector2(float(x) + 165, 620), Color(c, 0.20), 20)

	# برج‌ها و ستون‌های شکسته
	for x in range(450, int(world_width), 980):
		var corrupted := x > 18500
		var body := Color("2c3d42") if not corrupted else Color("352b2e")
		var glow := Color("4cf6ea") if not corrupted else Color("ff4b36")
		var height := 160.0 + float(int(x / 10) % 170)
		draw_rect(Rect2(float(x), 630 - height, 82, height), body)
		draw_rect(Rect2(float(x) + 31, 650 - height, 18, maxf(20.0, height - 45.0)), Color(glow, 0.42))
		draw_line(Vector2(float(x) + 12, 630 - height + 35), Vector2(float(x) + 66, 630 - height + 35), Color(0.05, 0.08, 0.09, 0.8), 6)

	# تاج جنگل در لایه‌ی میانی
	for x in range(80, int(world_width), 240):
		var y := 595.0 + sin(float(x) * 0.013) * 26.0
		draw_circle(Vector2(float(x), y), 54.0, Color("123f37"))
		draw_circle(Vector2(float(x) + 34, y - 21), 39.0, Color("195447"))
		draw_circle(Vector2(float(x) - 28, y - 28), 32.0, Color("1c604f"))

	# گیاهان نورانی کوچک
	for x in range(240, int(world_width), 520):
		var c := Color("55fff0") if x < 18500 else Color("ff6b4d")
		var px := float(x)
		var py := 615.0 + sin(px * 0.021) * 13.0
		draw_circle(Vector2(px, py), 9.0, Color(c, 0.18))
		draw_circle(Vector2(px, py), 4.0, Color(c, 0.70))

	# کریستال‌های دوردست
	for x in range(700, int(world_width), 1750):
		var c := Color("61fff2") if x < 19000 else Color("ff5c45")
		var px := float(x)
		draw_colored_polygon(PackedVector2Array([
			Vector2(px, 606), Vector2(px + 15, 557),
			Vector2(px + 30, 606), Vector2(px + 15, 624)
		]), Color(c, 0.55))

	# از این نقطه فساد VARKON به‌تدریج غالب می‌شود
	draw_rect(Rect2(18500, 0, world_width - 18500, 760), Color(0.42, 0.03, 0.04, 0.09))
	draw_rect(Rect2(22200, 0, world_width - 22200, 760), Color(0.55, 0.025, 0.02, 0.06))
