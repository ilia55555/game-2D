extends Node
func _ready() -> void:
	call_deferred("capture")
func capture() -> void:
	var main = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().process_frame
	await get_tree().process_frame
	for j in range(20): await get_tree().process_frame
	await snap("menu")
	for i in range(5):
		main.start_stage(i)
		main.world.player.frozen = true
		for j in range(20): await get_tree().process_frame
		await snap("stage_%d" % i)
		main.world.player.position = Vector2(main.world.length-1150,620)
		main.world.start_boss()
		main.world.camera.position = Vector2(main.world.length-700,360)
		main.world.camera.reset_smoothing()
		for j in range(30): await get_tree().process_frame
		await snap("boss_%d" % i)
	main.show_map()
	for j in range(10): await get_tree().process_frame
	await snap("map")
	main.show_settings("menu")
	for j in range(10): await get_tree().process_frame
	await snap("settings")
	get_tree().quit()
func snap(key: String) -> void:
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("/tmp/velocity_"+key+".png")
	print("CAPTURE ",key)
