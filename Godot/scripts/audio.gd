extends Node
## The music is composed offline and streamed; synthesis never blocks a gameplay frame.
var decks: Array[AudioStreamPlayer] = []
var voices: Array[AudioStreamPlayer] = []
var bank: Dictionary = {}
var current_track: String = ""
var deck_index: int = 0
var voice_index: int = 0
var fade: Tween
var silent: bool = false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	silent = OS.get_cmdline_user_args().has("--test")
	for bus in ["Music", "SFX"]:
		AudioServer.add_bus()
		AudioServer.set_bus_name(AudioServer.bus_count - 1, bus)
	for i in range(2):
		var player = AudioStreamPlayer.new()
		player.bus = "Music"
		add_child(player)
		decks.append(player)
	for i in range(16):
		var player = AudioStreamPlayer.new()
		player.bus = "SFX"
		add_child(player)
		voices.append(player)
	for key in ["shoot", "jump", "dash", "hit", "explode", "gem", "checkpoint", "spring", "heal", "ui", "win", "alarm"]:
		bank[key] = load("res://assets/audio/sfx/" + key + ".wav")
	apply_volume()

func apply_volume() -> void:
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("Music"), linear_to_db(maxf(0.0001, GameState.settings.music)))
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("SFX"), linear_to_db(maxf(0.0001, GameState.settings.sfx)))

func music(track: String) -> void:
	if track == current_track or silent:
		return
	current_track = track
	if fade and fade.is_valid():
		fade.kill()
	var old = decks[deck_index]
	deck_index = 1 - deck_index
	var next = decks[deck_index]
	next.stream = load("res://assets/audio/music/" + track + ".ogg")
	next.volume_db = -40
	next.play()
	fade = create_tween().set_parallel(true)
	fade.tween_property(next, "volume_db", 0.0, 1.2)
	fade.tween_property(old, "volume_db", -40.0, 1.2)
	fade.chain().tween_callback(old.stop)

func play(key: String, pitch: float = 1.0, volume: float = 1.0) -> void:
	if silent or not bank.has(key):
		return
	var voice = voices[voice_index]
	voice_index = (voice_index + 1) % voices.size()
	voice.stream = bank[key]
	voice.pitch_scale = pitch
	voice.volume_db = linear_to_db(maxf(0.01, volume))
	voice.play()
