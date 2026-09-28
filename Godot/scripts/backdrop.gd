extends Node2D
var biome: int = 0
var world
var sky: Texture2D
var horizon: Texture2D
var time: float = 0
var menu: bool = false
func _ready() -> void:
	z_index = -100
	sky = load("res://assets/art/world/sky_%d.svg" % biome)
	horizon = load("res://assets/art/world/horizon_%d.svg" % biome)
func _process(delta: float) -> void:
	time += delta
	queue_redraw()
func _draw() -> void:
	var viewport_size = get_viewport_rect().size
	var camera_x = 0.0
	var camera_y = 360.0
	if is_instance_valid(world) and is_instance_valid(world.camera):
		camera_x = world.camera.get_screen_center_position().x
		camera_y = world.camera.get_screen_center_position().y
	elif menu: camera_x = time * 12
	draw_texture_rect(sky,Rect2(Vector2.ZERO,viewport_size),false)
	var tile_width = viewport_size.y * 1920.0/1080.0
	for layer in range(2):
		var f = .10 + layer * .13
		var offset = fposmod(camera_x * f,tile_width)
		for i in range(-1,3):
			draw_texture_rect(horizon,Rect2(i*tile_width-offset,80-layer*70-(camera_y-360)*f,tile_width,viewport_size.y),false,Color(.6,.84,.91,.35) if layer==0 else Color(.80,.94,.93,.72))
	# Slowly drifting motes, embers or snow complete the atmosphere without expensive shaders.
	for i in range(40):
		var x = fposmod(i*137.3 + sin(time*.4+i)*22 - camera_x*.5,viewport_size.x)
		var y = fposmod(i*79.7 + time*(12 if biome==2 else -8),viewport_size.y)
		var c = Color("f1dca4") if biome==3 else Color("c6f3e6")
		draw_circle(Vector2(x,y),1.2+sin(i)*.5,Color(c,.2+.15*sin(time+i)))
