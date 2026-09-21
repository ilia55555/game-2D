extends Node
## F6: jump straight to Admiral Manta without writing campaign progress.
func _ready() -> void:
	GameState.persistence_enabled = false
	call_deferred("start_preview")

func start_preview() -> void:
	var main = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	main.start_stage(1)
	var world = main.world
	world.player.position = Vector2(world.length - 1150, 620)
	world.checkpoint = world.player.position
	world.start_boss()
	world.camera.position = Vector2(world.length - 700, 360)
	world.camera.reset_smoothing()
