extends Node2D
var world
var kind: String = "spike"
var width: float = 100
var height: float = 180
var clock: float = 0
var phase: float = 0
var active: bool = false
var cooldown: float = 0
var art: Sprite2D
var checkpoint_index: int = 0

func _ready() -> void:
	z_index = 5
	if kind in ["checkpoint", "portal"]:
		art = Sprite2D.new()
		art.texture = load("res://assets/art/world/"+kind+".svg")
		art.centered = false
		art.scale = Vector2.ONE * (.62 if kind=="checkpoint" else .8)
		art.position = Vector2(-31,-102) if kind=="checkpoint" else Vector2(-72,-200)
		add_child(art)
		if kind=="portal": art.modulate = Color(.4,.5,.65,.65)

func _physics_process(delta: float) -> void:
	clock += delta
	cooldown = maxf(0,cooldown-delta)
	if not is_instance_valid(world.player) or world.player.dead or world.player.frozen: return
	var p = world.player
	var offset = p.global_position - global_position
	match kind:
		"spike":
			if offset.x > -15 and offset.x < width+15 and offset.y < 15 and offset.y > -22:
				p.take_damage(1,global_position+Vector2(width*.5,0))
		"laser":
			var cycle = fposmod(clock+phase,3.6)
			active = cycle > 1.4 and cycle < 2.6
			if active and absf(offset.x) < 26 and offset.y < 5 and offset.y > -height-10:
				p.take_damage(1,global_position)
		"spring":
			if absf(offset.x)< 30 and absf(offset.y)<18 and p.velocity.y>=0 and cooldown<=0:
				p.spring()
				cooldown = .35
		"checkpoint":
			if absf(offset.x)< 40 and absf(offset.y)<90 and not active:
				active = true
				world.checkpoint = Vector2(global_position.x+55,global_position.y-2)
				world.checkpoint_id = checkpoint_index
				p.health = p.max_health
				p.energy = 100
				Audio.play("checkpoint")
				world.banner("CHECKPOINT", "Health and energy restored")
				world.burst(global_position+Vector2(0,-60),Color("b4ffe3"),22)
		"portal":
			if world.boss_defeated:
				art.modulate = Color.WHITE
				if absf(offset.x)<48 and absf(offset.y)<120: world.finish()
	queue_redraw()
func _draw() -> void:
	match kind:
		"spike":
			for i in range(int(width/ 20)):
				var x = i*20.0
				draw_colored_polygon(PackedVector2Array([Vector2(x,0),Vector2(x+10,-22),Vector2(x+20,0)]),Color("b0c1cf"))
				draw_line(Vector2(x+10,-21),Vector2(x+17,-2),Color("f4d0b8"),2,true)
			draw_rect(Rect2(0,-1,width,6),Color("694c59"))
		"laser":
			var cycle = fposmod(clock+phase,3.6)
			var color = Color("ff706f") if active else Color("ffda9b")
			draw_rect(Rect2(-24,-6,48,12),Color("3c4d66"))
			draw_rect(Rect2(-22,-height-6,44,12),Color("3c4d66"))
			if active:
				draw_line(Vector2.ZERO,Vector2(0,-height),Color(color,.13),40,true)
				draw_line(Vector2.ZERO,Vector2(0,-height),color,8,true)
				draw_line(Vector2.ZERO,Vector2(0,-height),Color("fff0ce"),3,true)
			elif cycle > .7:
				for j in range(int(height/16)):draw_line(Vector2(0,-j*16),Vector2(0,-j*16-7),Color(color,.5),2,true)
		"spring":
			var squish = 8 if cooldown > .18 else 0
			var pts = PackedVector2Array()
			for i in range(7):pts.append(Vector2(- 20+i*7,-5-(0 if i%2 else 12-squish)))
			draw_polyline(pts,Color("b1c9d5"),4,true)
			draw_rect(Rect2(-29,- 20+squish,58,8),Color("ffe095"))
			draw_rect(Rect2(-33,0,66,8),Color("344860"))
		"checkpoint":
			if active:
				draw_arc(Vector2(0,-75),23,clock,clock+5, 30,Color("b5ffe0"),2,true)
		"portal":
			if world.boss_defeated:draw_arc(Vector2(0,-95),40,clock,clock+4.6, 40,Color("deffe2"),2,true)
