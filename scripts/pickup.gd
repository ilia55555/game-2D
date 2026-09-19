extends Node2D
var world
var kind: String = "gem"
var clock: float = 0
var taken: bool = false
var index: int = 0
var base_y: float
func _ready() -> void:
	base_y = position.y
	clock = position.x * .013
	z_index = 6
func _process(delta: float) -> void:
	if taken: return
	clock += delta
	position.y = base_y + sin(clock*2.6)*5
	if is_instance_valid(world.player) and not world.player.dead:
		if global_position.distance_to(world.player.global_position + Vector2(0,-32)) < (37 if kind=="relic" else 32):
			collect()
	queue_redraw()
func collect() -> void:
	if taken: return
	if kind == "heal" and world.player.health >= world.player.max_health: return
	taken = true
	match kind:
		"gem":
			world.gems += 1
			world.score += 100
			Audio.play("gem",1.0 + (world.gems % 7)*.06,.5)
		"relic":
			world.relics += 1
			world.score += 1500
			world.banner("CORE SHARD RECOVERED", "%d / 3 optional shards" % world.relics)
			Audio.play("checkpoint",1.2)
		"heal":
			world.player.health = mini(world.player.max_health,world.player.health+3)
			Audio.play("heal")
	world.burst(global_position,Color("ffe1a3") if kind=="relic" else Color("b3ffe2"),10)
	queue_free()
func _draw() -> void:
	var c = Color("9bffd7") if kind=="gem" else Color("ffd88b")
	var r = 10.0 if kind=="gem" else 17.0
	if kind=="heal":
		draw_circle(Vector2.ZERO,18,Color("183e50"))
		draw_rect(Rect2(-4,-11,8,22),Color("bcffd6"))
		draw_rect(Rect2(-11,-4,22,8),Color("bcffd6"))
		return
	draw_circle(Vector2.ZERO,r*1.9,Color(c,.09))
	var w = .8 + .2*sin(clock*3)
	var pts = PackedVector2Array([Vector2(0,-r),Vector2(r*w,0),Vector2(0,r),Vector2(-r*w,0)])
	draw_colored_polygon(pts,c)
	draw_colored_polygon(PackedVector2Array([pts[0],pts[1],Vector2.ZERO]),Color("f4ffe2"))
	draw_colored_polygon(PackedVector2Array([pts[2],pts[3],Vector2.ZERO]),Color("3f9eab"))
	if kind=="relic":draw_arc(Vector2.ZERO,24,clock,clock+4.5,24,Color(c,.6),1.5,true)
