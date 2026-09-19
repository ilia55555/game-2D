extends Node2D
var particles: Array = []
var rng = RandomNumberGenerator.new()
func _ready() -> void:
	z_index = 15
	rng.seed = 992
func burst(pos: Vector2, color: Color, count: int) -> void:
	for i in range(mini(count, 400 - particles.size())):
		particles.append({"p":pos,"v":Vector2(rng.randf_range(-170,170),rng.randf_range(-200,40)),"c":color,"t":rng.randf_range(.2,.55),"max":.55,"s":rng.randf_range(2,5)})
func _process(delta: float) -> void:
	for i in range(particles.size()-1,-1,-1):
		var p = particles[i]
		p.t -= delta
		if p.t <= 0:
			particles.remove_at(i)
			continue
		p.p += p.v * delta
		p.v.y += 280 * delta
	queue_redraw()
func _draw() -> void:
	for p in particles:
		draw_circle(p.p, p.s * minf(p.t*7,1), Color(p.c, minf(p.t*4,1)))
