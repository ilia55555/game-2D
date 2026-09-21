extends Control
var world
var font: Font = ThemeDB.fallback_font
var clock: float = 0
func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
func _process(delta: float) -> void:
	clock += delta
	queue_redraw()
func text_at(pos: Vector2,value: String,size_value: int=16,color: Color=Color("e7f6ed")) -> void:
	draw_string(font,pos,value,HORIZONTAL_ALIGNMENT_LEFT,-1,size_value,color)
func panel(rect: Rect2,color: Color=Color("102537")) -> void:
	var style = StyleBoxFlat.new()
	style.bg_color = Color(color,.92)
	style.set_corner_radius_all(12)
	style.border_color = Color(.65,.85,.85,.18)
	style.set_border_width_all(1)
	draw_style_box(style,rect)
func _draw() -> void:
	if not is_instance_valid(world) or not is_instance_valid(world.player): return
	var p = world.player
	var w = size.x
	panel(Rect2(24,22,290, 80))
	draw_circle(Vector2( 60,62),24,Color("294958"))
	text_at(Vector2(46,71),"V",26,Color("b6ffdb"))
	text_at(Vector2(98, 40),"SIGNAL  /  VEX",12,Color("8dafb5"))
	for i in range(8):
		var c = Color("b1f1c3") if p.health>i else Color("2c4656")
		draw_rect(Rect2(100+i*24, 55,18,19),c)
	text_at(Vector2(100, 90),"%s  •  %03d" % ["CORE SHARDS",world.relics],11,Color("f5dba3"))
	panel(Rect2(w*.5-180,22,360,56))
	text_at(Vector2(w*.5-160,44),"%02d  /  %s" % [world.index+1,world.definition.title],12)
	draw_rect(Rect2(w*.5-160,60,320,3),Color("28465b"))
	draw_rect(Rect2(w*.5-160,60,320*clampf(p.position.x/world.length,0,1),3),world.definition.accent)
	panel(Rect2(w-320,22,196,56))
	text_at(Vector2(w-302,44),"%06d" % world.score,20,Color("f7e1b2"))
	text_at(Vector2(w-302,64),"%03d GEMS   %02d:%02d" % [world.gems,int(world.elapsed)/60,int(world.elapsed)%60],11,Color("9fbcbc"))
	panel(Rect2(24,size.y-94,364,70))
	var weapon_names = ["PULSE","SCATTER","NOVA"]
	for i in range(3):
		var x =  42+i*115
		if p.weapon==i:draw_rect(Rect2(x-5,size.y-84,108, 30),Color(.65,.96,.85,.14))
		text_at(Vector2(x,size.y-64),"%d  %s" % [i+1,weapon_names[i]],12,Color("caffdc") if p.weapon==i else Color("6e949d"))
	draw_rect(Rect2(42,size.y-43,220,5),Color("2a475d"))
	draw_rect(Rect2(42,size.y-43,220*p.energy/100,5),Color("99d3e9"))
	text_at(Vector2(280,size.y-36),"ENERGY",10,Color("7fa6b1"))
	var dash_ready = p.dash_cooldown<=0
	panel(Rect2(w-215,size.y-76,191,52))
	text_at(Vector2(w-199,size.y-46),"SHIFT  /  " + ("DASH READY" if dash_ready else "RECHARGING"),12,Color("bdf5dc") if dash_ready else Color("688590"))
	if world.banner_timer>0:
		var alpha = minf(world.banner_timer*2,1)
		var title_width = font.get_string_size(world.banner_title,HORIZONTAL_ALIGNMENT_LEFT,-1,26).x
		text_at(Vector2(w*.5-title_width*.5,153),world.banner_title,26,Color(Color("fff0c9"),alpha))
		var sub_width = font.get_string_size(world.banner_subtitle,HORIZONTAL_ALIGNMENT_LEFT,-1,14).x
		text_at(Vector2(w*.5-sub_width*.5,179),world.banner_subtitle,14,Color(Color("c3dfd7"),alpha))
	if world.boss_started and not world.boss_defeated and is_instance_valid(world.boss):
		var b = world.boss
		panel(Rect2(w*.5-220,size.y-83,440,59))
		text_at(Vector2(w*.5-198,size.y-61),world.definition.boss_name,12,Color("f7d3b5"))
		draw_rect(Rect2(w*.5-198,size.y-49,396,9),Color("4b354e"))
		draw_rect(Rect2(w*.5-198,size.y-49,396*float(b.health)/b.max_health,9),Color("f6b787") if b.phase==1 else Color("ed9edf"))
