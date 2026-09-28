extends Node
## Persistent progress and settings. A failed write leaves the last valid save intact.
const SAVE_PATH = "user://velocity_save.json"
var unlocked: int = 0
var selected: int = 0
var best: Dictionary = {}
var settings: Dictionary = {"music": 0.65, "sfx": 0.8, "fullscreen": false, "shake": true, "assist": false, "touch": false}
var persistence_enabled: bool = true

func _ready() -> void:
	persistence_enabled = not OS.get_cmdline_user_args().has("--test")
	if persistence_enabled:
		load_progress()
	configure_inputs()
	apply_settings()

func configure_inputs() -> void:
	var keys = {"move_left": [KEY_A, KEY_LEFT], "move_right": [KEY_D, KEY_RIGHT], "jump": [KEY_SPACE, KEY_W, KEY_UP], "fire": [KEY_J, KEY_Z], "dash": [KEY_SHIFT, KEY_K, KEY_X], "weapon": [KEY_Q, KEY_E], "crouch": [KEY_S, KEY_DOWN], "pause_game": [KEY_ESCAPE, KEY_P]}
	for action in keys:
		if not InputMap.has_action(action):
			InputMap.add_action(action, 0.22)
		for code in keys[action]:
			var event = InputEventKey.new()
			event.physical_keycode = code
			InputMap.action_add_event(action, event)
	var buttons = {"jump": JOY_BUTTON_A, "fire": JOY_BUTTON_X, "dash": JOY_BUTTON_B, "weapon": JOY_BUTTON_RIGHT_SHOULDER, "pause_game": JOY_BUTTON_START, "move_left": JOY_BUTTON_DPAD_LEFT, "move_right": JOY_BUTTON_DPAD_RIGHT, "crouch": JOY_BUTTON_DPAD_DOWN}
	for action in buttons:
		var event = InputEventJoypadButton.new()
		event.button_index = buttons[action]
		InputMap.action_add_event(action, event)
	for direction in [-1.0, 1.0]:
		var event = InputEventJoypadMotion.new()
		event.axis = JOY_AXIS_LEFT_X
		event.axis_value = direction
		InputMap.action_add_event("move_left" if direction < 0 else "move_right", event)
	var mouse = InputEventMouseButton.new()
	mouse.button_index = MOUSE_BUTTON_LEFT
	InputMap.action_add_event("fire", mouse)

func apply_settings() -> void:
	if DisplayServer.get_name() != "headless":
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if settings.fullscreen else DisplayServer.WINDOW_MODE_WINDOWED)

func complete(index: int, score: int, seconds: float, gems: int, relics: int) -> void:
	unlocked = maxi(unlocked, mini(index + 1, 4))
	var key = str(index)
	var previous = best.get(key, {})
	best[key] = {"score": maxi(score, int(previous.get("score", 0))), "time": minf(seconds, float(previous.get("time", seconds))), "gems": maxi(gems, int(previous.get("gems", 0))), "relics": maxi(relics, int(previous.get("relics", 0)))}
	save_progress()

func save_progress(save_path: String = SAVE_PATH) -> bool:
	if not persistence_enabled:
		return true
	var file = FileAccess.open(save_path + ".tmp", FileAccess.WRITE)
	if file == null:
		push_warning("Could not save progress: " + str(FileAccess.get_open_error()))
		return false
	file.store_string(JSON.stringify({"version": 1, "unlocked": unlocked, "best": best, "settings": settings}, "", true, true))
	file.flush()
	var ok = file.get_error() == OK
	file.close()
	if not ok:
		return false
	# POSIX/Windows Godot rename replaces the destination; never delete the valid save first.
	return DirAccess.rename_absolute(ProjectSettings.globalize_path(save_path + ".tmp"), ProjectSettings.globalize_path(save_path)) == OK

func load_progress(save_path: String = SAVE_PATH) -> void:
	if not FileAccess.file_exists(save_path):
		return
	var parser = JSON.new()
	if parser.parse(FileAccess.get_file_as_string(save_path)) != OK:
		return
	var value = parser.data
	if not value is Dictionary or int(value.get("version", 0)) != 1:
		return
	unlocked = clampi(int(value.get("unlocked", 0)), 0, 4)
	if value.get("best") is Dictionary:
		best.clear()
		for i in range(5):
			var record = value.best.get(str(i))
			if not record is Dictionary: continue
			var valid = true
			for key in ["score", "time", "gems", "relics"]:
				if not (record.get(key) is float or record.get(key) is int): valid = false
			if valid:
				best[str(i)] = {"score": maxi(0,int(record.score)), "time": maxf(0,float(record.time)), "gems": maxi(0,int(record.gems)), "relics": clampi(int(record.relics),0,3)}
	if value.get("settings") is Dictionary:
		for key in settings:
			if typeof(value.settings.get(key)) == typeof(settings[key]):
				settings[key] = value.settings[key]
	settings.music = clampf(float(settings.music), 0, 1)
	settings.sfx = clampf(float(settings.sfx), 0, 1)
