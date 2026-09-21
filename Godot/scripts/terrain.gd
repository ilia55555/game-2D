extends AnimatableBody2D
var size: Vector2 = Vector2(300,60)
var biome: int = 0
var moving: Vector2 = Vector2.ZERO
var period: float = 3
var origin: Vector2
var time: float = 0
var crumble: bool = false
var breaking: float = -1
var restore: float = 0
var collider: CollisionShape2D
var texture: Texture2D
var world

func _ready() -> void:
	collision_layer = 2
	collision_mask = 0
	sync_to_physics = false
	origin = position
	texture = load("res://assets/art/world/terrain_%d.svg" % biome)
	texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	collider = CollisionShape2D.new()
	var shape = RectangleShape2D.new()
	shape.size = size
	collider.shape = shape
	collider.position = size*.5
	collider.one_way_collision = size.y < 80
	add_child(collider)

func _physics_process(delta: float) -> void:
	time += delta
	if moving != Vector2.ZERO:
		position = origin + moving * sin(time * TAU / period)
	if crumble and is_instance_valid(world.player):
		var p = world.player
		if breaking < 0 and restore <= 0 and absf(p.position.y - position.y) < 5 and p.position.x > position.x and p.position.x < position.x + size.x and p.is_on_floor():
			breaking = .7
		if breaking >= 0:
			breaking -= delta
			modulate = Color(1, .7 + .3*sin(time*40), .65)
			if breaking < 0:
				restore = 3.0
				collider.set_deferred("disabled", true)
				visible = false
		elif restore > 0:
			restore -= delta
			if restore <= 0:
				# Wait if somebody occupies the tile; do not reappear inside the player.
				if Rect2(position - Vector2(25,0),size + Vector2(50,60)).has_point(p.position):
					restore = .3
				else:
					visible = true
					modulate = Color.WHITE
					collider.set_deferred("disabled", false)

func _draw() -> void:
	draw_rect(Rect2(8,8,size.x,size.y),Color(0.01,.02,.06,.3))
	var x = 0.0
	while x < size.x:
		var w = minf(256,size.x-x)
		var y = 0.0
		while y < size.y:
			var h = minf(128,size.y-y)
			draw_texture_rect_region(texture,Rect2(x,y,w,h),Rect2(0,0 if y==0 else 100,w*2,h*2))
			y += 128
		x += 256
	if crumble:
		for k in range(3):
			var a = Vector2(35+k*57,5)
			draw_polyline(PackedVector2Array([a,a+Vector2(13,12),a+Vector2(5,26),a+Vector2(20,42)]),Color("bdd9e9"),2,true)
	if moving != Vector2.ZERO:
		draw_rect(Rect2(10,size.y-10,size.x-20,3),Color("b3fff0"))
