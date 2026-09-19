extends Node
## Integration tests run real CharacterBody2D physics, swept projectiles and all five worlds.
var failures: Array[String] = []
var checks: int = 0
var main
func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	call_deferred("run")
func check(value: bool,message: String) -> void:
	checks += 1
	if not value:
		failures.append(message)
		printerr("FAIL: ",message)
func frames(count: int) -> void:
	for i in range(count): await get_tree().physics_frame
func run() -> void:
	main = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await frames(3)
	check(main.screen=="menu","Game starts at the title screen")
	for track in ["menu","stage_0","stage_1","stage_2","stage_3","stage_4","boss"]:
		var stream = load("res://assets/audio/music/"+track+".ogg")
		check(stream!=null and stream.loop and stream.get_length()>20,"Music loop: "+track)
	main.show_map()
	check(main.screen=="map","World selection opens")
	await frames(3)
	for child in main.root.get_children():
		if child is TextureRect: check(child.size.y<=140,"Map previews stay inside their cards")
	main.show_settings("menu")
	check(main.screen=="settings","Settings opens")
	main.return_from_submenu()
	main.show_controls("menu")
	check(main.screen=="controls","Controls opens")
	main.return_from_submenu()
	await test_movement()
	await test_projectiles()
	for stage in range(5): await test_stage(stage)
	await test_save()
	main.show_menu()
	await frames(2)
	check(get_tree().get_nodes_in_group("player").is_empty(),"Leaving campaign removes the player")
	check(get_tree().get_nodes_in_group("projectiles").is_empty(),"Leaving campaign removes projectiles")
	print("VELOCITY TESTS: ",checks," checks; ",failures.size()," failures")
	get_tree().quit(0 if failures.is_empty() else 1)

func test_movement() -> void:
	main.start_stage(0)
	var w = main.world
	var p = w.player
	p.automation = true
	await frames(12)
	check(p.is_on_floor(),"Player spawns on solid ground")
	var start_y = p.position.y
	p.auto_jump = true
	await frames(10)
	check(p.position.y<start_y-50,"Jump lifts the character")
	var first_peak = p.position.y
	p.auto_jump = true
	await frames(10)
	check(p.position.y<first_peak-50 and p.jumps==0,"Second jump works once in mid-air")
	p.auto_jump = true
	await frames(2)
	check(p.jumps==0,"Air jumps are bounded")
	await frames(100)
	check(p.is_on_floor() and p.jumps==2,"Landing restores jump availability")
	p.automation = false
	Input.action_press("dash")
	await frames(2)
	Input.action_release("dash")
	check(p.dash_timer>0 and absf(p.velocity.x)>800,"Dash uses real physics velocity")
	var hp = p.health
	p.take_damage(2,p.position+Vector2(10,0))
	check(p.health==hp,"Dash grants damage immunity")
	await frames( 20)
	hp = p.health
	p.invincible = 0
	p.take_damage(1,p.position+Vector2(10,0))
	p.take_damage(1,p.position+Vector2(10,0))
	check(p.health==hp-1,"Contact damage respects invulnerability")
	p.automation = true
	p.auto_move = 0
	w.checkpoint = Vector2(300,618)
	p.die()
	await frames( 80)
	check(w.player!=p and not w.player.dead,"Death creates a clean player")
	check(w.player.position.distance_to(w.checkpoint)<10,"Death returns to the current checkpoint")
	main.pause_game()
	var pos = w.player.position
	await frames( 20)
	check(w.player.position==pos and get_tree().paused,"Pause freezes gameplay")
	main.show_settings("pause")
	main.return_from_submenu()
	check(main.screen=="pause","Settings returns to pause without losing the run")
	main.resume_game()
	check(not get_tree().paused and main.world==w,"Resume keeps the same level")

func test_projectiles() -> void:
	main.start_stage(0)
	var w = main.world
	var p = w.player
	p.automation = true
	p.invincible = 1000
	await frames(15)
	p.automation = false
	Input.action_press("crouch")
	await frames(3)
	check(p.crouching and p.standing_shape.height==42,"Crouch changes the actual hitbox")
	Input.action_release("crouch")
	await frames(3)
	check(not p.crouching and p.standing_shape.height==64,"Releasing crouch restores the standing hitbox")
	p.automation = true
	p.weapon = 2
	p.energy = 9
	p.shoot()
	check(p.energy>=0,"Insufficient Nova energy falls back without going negative")
	await frames(2)
	for shot in get_tree().get_nodes_in_group("projectiles"): shot.queue_free()
	for existing in get_tree().get_nodes_in_group("enemies"): existing.queue_free()
	await frames(2)
	var enemy = load("res://scripts/enemy.gd").new()
	enemy.world = w
	enemy.kind = "turret"
	enemy.position = Vector2(500,620)
	w.add_child(enemy)
	await frames(2)
	var health = enemy.health
	w.projectile(Vector2(200,580),Vector2(14000,0),true,1,Color.WHITE)
	await frames(5)
	check(enemy.health==health-1,"Swept bullet hits a target at extreme speed")
	var wall = w.add_terrain(Vector2(350,500),Vector2(8,120))
	await frames(2)
	health = enemy.health
	w.projectile(Vector2(200,580),Vector2(14000,0),true,1,Color.WHITE)
	await frames(5)
	check(enemy.health==health,"An 8-pixel wall stops a fast bullet")
	wall.queue_free()
	health = enemy.health
	w.projectile(Vector2(500,580),Vector2(1000,0),true,1,Color.WHITE)
	await frames(3)
	check(enemy.health==health-1,"Point-blank shots hit when the muzzle is inside a target")
	# Checkpoint and relic behavior through their real collection code.
	var relic = load("res://scripts/pickup.gd").new()
	relic.world = w
	relic.kind = "relic"
	relic.position = p.position+Vector2(0,-32)
	w.add_child(relic)
	await frames(3)
	check(w.relics==1,"Optional shard can actually be collected")

func test_stage(stage: int) -> void:
	main.start_stage(stage)
	var w = main.world
	var p = w.player
	p.automation = true
	p.auto_move = 1
	p.auto_fire = true
	p.invincible = 10000
	check(w.definition.relics.size()==3,"Stage %d has three optional shards"%stage)
	check(w.definition.checkpoints.size()==3,"Stage %d has three checkpoints"%stage)
	check(get_tree().get_nodes_in_group("enemies").size()>=15,"Stage %d has authored encounters"%stage)
	await frames(10)
	# Bot traverses the entire mandatory route with ordinary movement/jumps and shooting.
	var steps = 0
	while not w.boss_started and steps<4200 and not p.dead:
		steps += 1
		p.invincible = 10000
		if p.is_on_floor():
			var origin = p.position+Vector2(105,-8)
			var query = PhysicsRayQueryParameters2D.create(origin,origin+Vector2(0,85),2)
			var jump = w.get_world_2d().direct_space_state.intersect_ray(query).is_empty() or p.is_on_wall()
			for h in w.definition.spikes:
				if h[0]-p.position.x>0 and h[0]-p.position.x<140: jump = true
			if jump: p.auto_jump = true
		elif p.velocity.y>80 and p.position.y>510 and p.jumps>0:
			var query = PhysicsRayQueryParameters2D.create(p.position,p.position+Vector2(0,110),2)
			if w.get_world_2d().direct_space_state.intersect_ray(query).is_empty(): p.auto_jump = true
		await frames(1)
	check(w.boss_started and not p.dead,"Stage %d mandatory route is traversable (%d physics ticks, x=%.0f)"%[stage,steps,p.position.x])
	print("ROUTE ",stage+1," ticks=",steps," x=",int(p.position.x)," kills=",w.kills)
	if not w.boss_started:
		p.position = Vector2(w.definition.arena+200,620)
		w.start_boss()
	p.auto_move = 0
	p.auto_fire = false
	p.position = Vector2(w.definition.arena+250,620)
	await frames(130)
	var b = w.boss
	check(b.active and b.state!="intro","Guardian %d activates"%stage)
	if stage == 1:
		check(b.art.hframes == 4 and b.art.vframes == 2, "Manta uses the eight-frame raster atlas")
		var source_image = Image.load_from_file("res://assets/art/bosses/manta_pixel.png")
		check(source_image != null and source_image.detect_alpha() != Image.ALPHA_NONE, "Manta source sprite has transparency")
		for pose in [["idle", 0, 0], ["telegraph", 0, 4], ["attack", 1, 5], ["attack", 0, 6], ["recover", 0, 7]]:
			b.state = pose[0]
			b.attack = pose[1]
			b.clock = 0
			b.update_manta_frame()
			check(b.art.frame == pose[2], "Manta pose: " + str(pose[0]) + "/" + str(pose[1]))
		b.direction = 1
		b.update_manta_frame()
		check(b.art.flip_h, "Manta faces right for a rightward attack")
		b.direction = -1
		b.update_manta_frame()
		check(not b.art.flip_h, "Manta faces left for a leftward attack")
		b.set_state("idle", .45)
	for attack in range(5):
		b.attack = attack
		b.lock_target = p.position
		b.direction = 1
		b.rain_targets.clear()
		b.rain_targets.append(p.position)
		b.execute_attack()
		await frames(100)
	check(b.position.x>=b.arena_left and b.position.x<=b.arena_right,"Guardian %d stays in arena"%stage)
	b.hit(int(b.max_health*.6))
	check(b.phase==2,"Guardian %d enters second phase"%stage)
	# Retrying an active guardian must remove the lock, projectiles and old health/state.
	p.die()
	await frames(80)
	check(not w.boss_started and w.boss.health==w.boss.max_health,"Guardian %d resets after player death"%stage)
	check(not is_instance_valid(w.arena_gate),"Arena gate %d is removed on retry"%stage)
	check(get_tree().get_nodes_in_group("projectiles").is_empty(),"Projectiles %d are cleared on retry"%stage)
	p = w.player
	p.automation = true
	p.invincible = 10000
	p.position = Vector2(w.definition.arena+200,620)
	await frames(130)
	b = w.boss
	check(b.active,"Guardian %d can be re-entered"%stage)
	p.auto_fire = true
	p.auto_move = 0
	p.weapon = 0
	var combat_ticks = 0
	while not w.boss_defeated and combat_ticks<4800:
		combat_ticks += 1
		p.invincible = 10000
		if is_instance_valid(b):
			p.facing = signf(b.position.x-p.position.x)
			var separation = absf(b.position.x-p.position.x)
			p.auto_move = p.facing if separation>420 else (-p.facing if separation<200 else 0.0)
			if p.position.x<w.definition.arena+110 or p.position.x>w.length-150: p.auto_move = 0.0
			if b.position.y<590 and p.is_on_floor(): p.auto_jump = true
		await frames(1)
	print("COMBAT ",stage+1," ticks=",combat_ticks)
	p.auto_fire = false
	p.auto_move = 0
	await frames(2)
	check(w.boss_defeated,"Guardian %d defeat opens the exit"%stage)
	p.position = Vector2(w.length-130,620)
	await frames(3)
	check(w.completed and main.screen=="results","World %d exits into results"%stage)
	check(GameState.unlocked>=mini(stage+1,4),"World %d unlocks the next world"%stage)
	check(GameState.best.has(str(stage)),"World %d records its score"%stage)
	check(not GameState.persistence_enabled,"Tests never overwrite player saves")

func test_save() -> void:
	var saved = GameState.best.duplicate(true)
	var unlocked = GameState.unlocked
	GameState.persistence_enabled = true
	var file = "user://velocity_integration_test.json"
	check(GameState.save_progress(file),"Atomic progress save succeeds")
	GameState.best = {}
	GameState.unlocked = 0
	GameState.load_progress(file)
	check(GameState.best==saved and GameState.unlocked==unlocked,"Progress round-trips across reload")
	var broken = FileAccess.open(file,FileAccess.WRITE)
	broken.store_string("{invalid")
	broken.close()
	GameState.load_progress(file)
	check(GameState.best==saved,"Malformed save is ignored safely")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(file))
	GameState.persistence_enabled = false
