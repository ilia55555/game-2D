extends Node2D
const Level = preload("res://scripts/level.gd")
const HUD = preload("res://scripts/hud.gd")
const Campaign = preload("res://scripts/campaign.gd")
const Backdrop = preload("res://scripts/backdrop.gd")
const HeroRig = preload("res://scripts/hero_rig.gd")
var world
var ui: CanvasLayer
var root: Control
var hud
var screen: String = "menu"
var previous: String = "menu"
var menu_backdrop
var menu_hero
var menu_clock: float = 0
var resume_button: Button
var accent: Color = Color("c4f2c3")
var dim: Color = Color("8eafb2")
var base_theme: Theme
var touch_actions: Array[String] = []

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	build_theme()
	ui = CanvasLayer.new()
	ui.layer = 30
	ui.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(ui)
	show_menu()
	get_viewport().size_changed.connect(_on_resize)
	# Developer-only CLI conveniences are kept separate from normal play and saves.
	var args = OS.get_cmdline_user_args()
	if OS.is_debug_build() and args.has("--stage"):
		var at = args.find("--stage")
		if at+1<args.size(): start_stage(clampi(int(args[at+1]),0,4))

func _notification(what: int) -> void:
	if what==NOTIFICATION_APPLICATION_FOCUS_OUT and screen=="game": pause_game()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause_game"):
		if screen=="game": pause_game()
		elif screen=="pause": resume_game()
		elif screen in ["settings","controls","credits"]: return_from_submenu()
		elif screen=="map": show_menu()
		get_viewport().set_input_as_handled()
	if event is InputEventKey and event.pressed and event.keycode==KEY_F11:
		GameState.settings.fullscreen = not GameState.settings.fullscreen
		GameState.apply_settings()
		GameState.save_progress()

func _process(delta: float) -> void:
	menu_clock += delta
	if is_instance_valid(menu_hero):
		menu_hero.pose(delta,0,0,true,false,false,1)

func build_theme() -> void:
	base_theme = Theme.new()
	base_theme.default_font_size = 18
	for state in ["normal","hover","pressed","focus","disabled"]:
		var style = StyleBoxFlat.new()
		style.bg_color = Color("203e4c") if state=="normal" else Color("305663")
		if state=="disabled": style.bg_color = Color("172b3c")
		style.border_color = Color("a8e7c5") if state in ["focus","hover"] else Color("44636c")
		style.set_border_width_all(1 if state!="focus" else 2)
		style.set_corner_radius_all(10)
		style.content_margin_left =  24
		style.content_margin_right = 24
		base_theme.set_stylebox(state,"Button",style)
	base_theme.set_color("font_color","Button",Color("e5f5e6"))
	base_theme.set_color("font_disabled_color","Button",Color("526775"))
	base_theme.set_color("font_color","Label",Color("e2f1e7"))

func clear_ui() -> void:
	release_touch()
	if is_instance_valid(root):
		ui.remove_child(root)
		root.queue_free()
	menu_hero = null
	root = Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.theme = base_theme
	ui.add_child(root)

func label(value: String,pos: Vector2,size_value: int=18,color: Color=Color("e4f2e8"),width: float=600) -> Label:
	var node = Label.new()
	node.text = value
	node.position = pos
	node.size.x = width
	node.add_theme_font_size_override("font_size",size_value)
	node.add_theme_color_override("font_color",color)
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(node)
	return node

func button(value: String,pos: Vector2,width: float,action: Callable,primary: bool=false) -> Button:
	var node = Button.new()
	node.text = value
	node.position = pos
	node.size = Vector2(width,52)
	node.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	node.pressed.connect(func(): Audio.play("ui"); action.call())
	if primary:
		var style = base_theme.get_stylebox("normal","Button").duplicate()
		style.bg_color = Color("c6edba")
		style.border_color = Color("ecf5ce")
		node.add_theme_stylebox_override("normal",style)
		node.add_theme_color_override("font_color",Color("173e45"))
	root.add_child(node)
	return node

func panel(pos: Vector2,size_value: Vector2,color: Color=Color("142a3d")) -> Panel:
	var node = Panel.new()
	node.position = pos
	node.size = size_value
	var style = StyleBoxFlat.new()
	style.bg_color = Color(color,.97)
	style.set_corner_radius_all(20)
	style.set_border_width_all(1)
	style.border_color = Color("425d68")
	node.add_theme_stylebox_override("panel",style)
	root.add_child(node)
	return node

func make_menu_background() -> void:
	var background = Backdrop.new()
	background.menu = true
	background.biome = 0
	root.add_child(background)
	var size_value = get_viewport_rect().size
	var shade = ColorRect.new()
	shade.size = size_value
	shade.color = Color(.03,.09,.15,.38)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(shade)
	for i in range(3):
		var tree = Sprite2D.new()
		tree.texture = load("res://assets/art/world/tree.svg")
		tree.scale = Vector2.ONE*(1.1+i*.35)
		tree.position = Vector2(size_value.x*.65+i*230,size_value.y-180)
		tree.modulate = Color(.5,.7,.68,.8)
		root.add_child(tree)
	var ledge = Sprite2D.new()
	ledge.texture = load("res://assets/art/world/terrain_0.svg")
	ledge.centered = false
	ledge.position = Vector2(size_value.x*.56,size_value.y-105)
	ledge.scale = Vector2(1.6,1.0)
	root.add_child(ledge)
	var hero_pivot = Node2D.new()
	hero_pivot.position = Vector2(size_value.x*.76,size_value.y-110)
	hero_pivot.scale = Vector2.ONE*2.8
	root.add_child(hero_pivot)
	menu_hero = HeroRig.new()
	hero_pivot.add_child(menu_hero)
	var plant = Sprite2D.new()
	plant.texture = load("res://assets/art/world/fern.svg")
	plant.position = Vector2(size_value.x*.90,size_value.y-110)
	plant.scale = Vector2.ONE*1.2
	root.add_child(plant)

func show_menu() -> void:
	get_tree().paused = false
	if is_instance_valid(world):
		remove_child(world)
		world.queue_free()
		world = null
	screen = "menu"
	clear_ui()
	make_menu_background()
	var h = get_viewport_rect().size.y
	label("AN ORIGINAL ACTION PLATFORMER",Vector2( 72, 60),13,accent)
	label("VELOCITY",Vector2(64,105), 84,Color("f3f3dc"))
	label("E C H O E S   O F   T H E   C O R E",Vector2( 72,204),18,Color("b9d7c4"))
	label("Five worlds. One impossible signal.",Vector2(74,255),20)
	label("Run into the unknown. Bring the light back.",Vector2(74,287),15,dim)
	var primary = button("CONTINUE JOURNEY" if GameState.unlocked>0 else "BEGIN JOURNEY",Vector2(74,355),340,func():start_stage(GameState.unlocked),true)
	primary.grab_focus()
	button("CHOOSE A WORLD",Vector2(74,420),340,show_map)
	button("SETTINGS",Vector2(74,485),164,func():show_settings("menu"))
	button("HOW TO PLAY",Vector2(250,485),164,func():show_controls("menu"))
	button("CREDITS",Vector2(74,550),164,show_credits)
	button("QUIT",Vector2(250,550),164,func():get_tree().quit())
	label("A / D  MOVE    •    SPACE  JUMP    •    J  FIRE    •    SHIFT  DASH",Vector2(74,h-54),12,dim)
	label("01 — 05     /     SINGLE PLAYER CAMPAIGN",Vector2(get_viewport_rect().size.x-430, 40),12,Color("bddacb"),400)
	Audio.music("menu")

func start_stage(index: int) -> void:
	get_tree().paused = false
	if is_instance_valid(world):
		remove_child(world)
		world.queue_free()
	clear_ui()
	screen = "game"
	world = Level.new()
	world.index = index
	add_child(world)
	build_hud()

func build_hud() -> void:
	clear_ui()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud = HUD.new()
	hud.world = world
	root.add_child(hud)
	var pause = button("II",Vector2(get_viewport_rect().size.x-100,22), 72,pause_game)
	pause.size.y = 56
	pause.focus_mode = Control.FOCUS_NONE
	if GameState.settings.touch or DisplayServer.is_touchscreen_available(): build_touch()

func pause_game() -> void:
	if screen!="game": return
	screen = "pause"
	get_tree().paused = true
	clear_ui()
	darken()
	var center = get_viewport_rect().size*.5
	panel(center-Vector2(240,245),Vector2(480,490))
	label("SIGNAL PAUSED",center-Vector2(192,207), 34,accent)
	label("Take a breath. The core can wait.",center-Vector2(190,153),15,dim)
	resume_button = button("RESUME",center-Vector2(190,100),380,resume_game,true)
	resume_button.grab_focus()
	button("SETTINGS",center-Vector2(190,35),380,func():show_settings("pause"))
	button("CONTROLS",center+Vector2(-190,30),380,func():show_controls("pause"))
	button("RESTART WORLD",center+Vector2(-190,95),380,confirm_restart)
	button("WORLD SELECT",center+Vector2(-190,160),380,show_map)

func confirm_restart() -> void:
	clear_ui()
	darken()
	var center = get_viewport_rect().size*.5
	panel(center-Vector2(260,125),Vector2(520,250))
	label("RESTART THIS WORLD?",center-Vector2(215, 90), 26,accent)
	label("This run's score and checkpoints will reset.",center-Vector2(215,35),16,dim)
	button("RESTART",center+Vector2(-215, 40),200,func():start_stage(world.index)).grab_focus()
	button("CANCEL",center+Vector2(15, 40),200,func():screen="game";pause_game())

func resume_game() -> void:
	screen = "game"
	get_tree().paused = false
	build_hud()

func darken() -> void:
	var shade = ColorRect.new()
	shade.color = Color(.025,.06,.10,.88)
	shade.size = get_viewport_rect().size
	root.add_child(shade)

func show_map() -> void:
	screen = "map"
	get_tree().paused = true
	clear_ui()
	darken()
	var w = get_viewport_rect().size.x
	label("THE FIVE CORE WORLDS",Vector2(54,60),38,accent)
	label("Defeat each guardian to unlock the next world. Return to find every hidden shard.",Vector2(56,119),16,dim)
	var card_width = (w-108-4*16)/5
	for i in range(5):
		var x = 54+i*(card_width+16)
		panel(Vector2(x,194),Vector2(card_width,355))
		var image = TextureRect.new()
		image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		image.texture = load("res://assets/art/world/sky_%d.svg" % i)
		image.position = Vector2(x+10,204)
		image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		image.size = Vector2(card_width-20,140)
		image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		image.mouse_filter = Control.MOUSE_FILTER_IGNORE
		image.clip_contents = true
		root.add_child(image)
		image.set_deferred("size", Vector2(card_width-20,140))
		var boss_icon = TextureRect.new()
		boss_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		if i == 1:
			var preview = AtlasTexture.new()
			preview.atlas = preload("res://assets/art/bosses/manta_pixel.png")
			preview.region = Rect2(Vector2.ZERO, preview.atlas.get_size() / Vector2(4, 2))
			boss_icon.texture = preview
			boss_icon.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		else:
			boss_icon.texture = load("res://assets/art/bosses/"+Campaign.ART[i]+".svg")
		boss_icon.position = Vector2(x+24,214)
		boss_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		boss_icon.size = Vector2(card_width-48,130)
		boss_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		boss_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
		boss_icon.clip_contents = true
		root.add_child(boss_icon)
		boss_icon.set_deferred("size", Vector2(card_width-48,130))
		if i in [0,3,4]:
			for arm_id in range(2):
				var arm_icon = TextureRect.new()
				arm_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
				arm_icon.texture = load("res://assets/art/bosses/"+Campaign.ART[i]+"_arm_%d.svg" % arm_id)
				arm_icon.position = boss_icon.position
				arm_icon.size = Vector2(card_width-48,130)
				arm_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
				arm_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
				root.add_child(arm_icon)
				arm_icon.set_deferred("size", Vector2(card_width-48,130))
		label("WORLD  %02d" % (i+1),Vector2(x+18,365),12,Campaign.ACCENTS[i],card_width-36)
		var title = label(["VERDANT\nFRONTIER", "BRASS\nSKYWAYS", "PRISMATIC\nDEPTHS", "EMBER\nENGINE", "ECLIPSE\nCITADEL"][i],Vector2(x+18,389),18,Color("eff3e1"),card_width- 36)
		title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		title.size.x = card_width-36
		var progress = GameState.best.get(str(i),{})
		label("%d / 3 SHARDS" % int(progress.get("relics",0)) if i<=GameState.unlocked else "GUARDIAN SEALED",Vector2(x+18,463),12,dim,card_width-36)
		var btn = button("PLAY" if i<=GameState.unlocked else "LOCKED",Vector2(x+12,490),card_width-24,start_stage.bind(i),i==GameState.unlocked)
		btn.size.y =  42
		btn.disabled = i>GameState.unlocked
		if i==GameState.unlocked: btn.grab_focus()
	button("BACK",Vector2(54,600),190,show_menu)
	if is_instance_valid(world) and not world.completed:button("RESUME RUN",Vector2(w-264,600),210,resume_game)

func show_settings(origin: String) -> void:
	previous = origin
	screen = "settings"
	clear_ui()
	darken()
	var x = get_viewport_rect().size.x*.5-320
	panel(Vector2(x,70),Vector2(640,590))
	label("TUNE YOUR EXPERIENCE",Vector2(x+ 40,101), 30,accent)
	var y = 185.0
	for key in ["music","sfx"]:
		label("MUSIC" if key=="music" else "SOUND EFFECTS",Vector2(x+ 40,y),16)
		var slider = HSlider.new()
		slider.position = Vector2(x+265,y+3)
		slider.size = Vector2(320, 30)
		slider.min_value = 0
		slider.max_value = 1
		slider.step = .05
		slider.value = GameState.settings[key]
		slider.value_changed.connect(func(value):GameState.settings[key]=value;Audio.apply_volume())
		root.add_child(slider)
		y += 65
	for row in [["fullscreen","FULLSCREEN"],["shake","CAMERA SHAKE"],["assist","ASSIST MODE"],["touch","TOUCH CONTROLS"]]:
		var toggle = CheckButton.new()
		toggle.text = row[1]
		toggle.position = Vector2(x+ 40,y)
		toggle.size = Vector2(560, 40)
		toggle.button_pressed = GameState.settings[row[0]]
		toggle.toggled.connect(func(value):GameState.settings[row[0]]=value;GameState.apply_settings())
		root.add_child(toggle)
		y +=  50
	label("Assist: longer damage protection and gentler enemies.\nGuardian health changes on the next world load or retry.",Vector2(x+ 40,530),12,dim,560)
	button("SAVE & BACK",Vector2(x+ 40,588),560,return_from_submenu,true).grab_focus()

func show_controls(origin: String) -> void:
	previous = origin
	screen = "controls"
	clear_ui()
	darken()
	var x = get_viewport_rect().size.x*.5-360
	panel(Vector2(x,55),Vector2(720,610))
	label("MAKE EVERY MOVE COUNT",Vector2(x+40, 80),32,accent)
	var rows = [["MOVE","A / D or arrows","Left stick / D-pad"],["JUMP / DOUBLE JUMP","Space / W / Up","A"],["FIRE","J / Z / Left mouse","X"],["DASH (DODGE DAMAGE)","Shift / K / X","B"],["CYCLE WEAPON","Q / E or 1 / 2 / 3","RB"],["CROUCH","S / Down","D-pad down"],["PAUSE","Esc / P","Start"]]
	for i in range(rows.size()):
		var y = 159+i* 47
		label(rows[i][0],Vector2(x+ 40,y),14,accent,240)
		label(rows[i][1],Vector2(x+300,y),14,Color("e1ede5"),250)
		label(rows[i][2],Vector2(x+560,y),13,dim,130)
	label("Hold jump to rise higher. Dash through shots or into enemies.\nPulse has unlimited ammo; Scatter and Nova consume regenerating energy.\nCheckpoints restore health. Hidden shards reward exploration.",Vector2(x+40,505),14,dim,640)
	button("BACK",Vector2(x+40,592),640,return_from_submenu,true).grab_focus()

func return_from_submenu() -> void:
	GameState.save_progress()
	if previous=="pause":
		screen = "game"
		pause_game()
	else: show_menu()

func show_credits() -> void:
	previous = "menu"
	screen = "credits"
	clear_ui()
	darken()
	var center = get_viewport_rect().size*.5
	panel(center-Vector2(350,250),Vector2(700,500))
	label("VELOCITY",center-Vector2(300,210),54,accent)
	label("ECHOES OF THE CORE",center-Vector2(297,138), 18,dim)
	label("A game for Ilia\n\nOriginal vector artwork, articulated animation and five worlds.\nOriginal seven-track score and synthesized sound effects.\nBuilt with Godot Engine 4.5.\n\nInspired by the energy of classic run-and-gun platformers.\nAll characters, worlds and music here are original.",center-Vector2(297, 80),17,Color("deebe1"),600)
	button("BACK",center+Vector2(-300,165),600,show_menu,true).grab_focus()

func stage_finished() -> void:
	_show_results.call_deferred()

func _show_results() -> void:
	screen = "results"
	get_tree().paused = true
	clear_ui()
	darken()
	var center = get_viewport_rect().size*.5
	panel(center-Vector2(335,260),Vector2(670,520))
	label("THE LIGHT RETURNS" if world.index==4 else "CORE RESTORED",center-Vector2(285,220), 40,accent)
	label("All five guardians defeated. The frontier is free." if world.index==4 else world.definition.title,center-Vector2(283,161),16,dim)
	var rank = "S" if world.relics==3 and world.deaths==0 else ("A" if world.relics>=2 else "B")
	label(rank,center+Vector2(150,-120), 92,Color("f7d79b"),100)
	label("SCORE    %06d\nGEMS     %03d\nSHARDS   %d / 3\nTIME       %02d:%02d\nRETRIES   %d" % [world.score,world.gems,world.relics,int(world.elapsed)/60,int(world.elapsed)%60,world.deaths],center-Vector2(280,100), 22,Color("e4eee1"),420)
	var b = button("NEXT WORLD" if world.index<4 else "RETURN TO WORLDS",center+Vector2(-285,140),570,func():start_stage(world.index+1) if world.index<4 else show_map(),true)
	b.grab_focus()
	button("REPLAY",center+Vector2(-285,205),275,func():start_stage(world.index))
	button("WORLD SELECT",center+Vector2(10,205),275,show_map)

func build_touch() -> void:
	var v = get_viewport_rect().size
	var specs = [["move_left","<",Vector2(30,v.y-175)],["move_right",">",Vector2(130,v.y-175)],["jump","UP",Vector2(v.x-110,v.y-185)],["fire","FIRE",Vector2(v.x-210,v.y-155)],["dash","DASH",Vector2(v.x-310,v.y-155)],["weapon","Q",Vector2(v.x-210,v.y-245)]]
	for spec in specs:
		var b = Button.new()
		b.text = spec[1]
		b.position = spec[2]
		b.size = Vector2(80,65)
		b.modulate.a = .65
		b.focus_mode = Control.FOCUS_NONE
		b.mouse_filter = Control.MOUSE_FILTER_IGNORE
		root.add_child(b)
		var touch = TouchScreenButton.new()
		touch.position = spec[2] + Vector2(40,32.5)
		var hitbox = RectangleShape2D.new()
		hitbox.size = Vector2(80,65)
		touch.shape = hitbox
		touch.action = spec[0]
		touch.pressed.connect(func():touch_actions.append(spec[0]))
		touch.released.connect(func():touch_actions.erase(spec[0]))
		root.add_child(touch)

func release_touch() -> void:
	for action in touch_actions: Input.action_release(action)
	touch_actions.clear()

func _on_resize() -> void:
	# Reflow only the active interface; never reload a running level on a window resize.
	match screen:
		"game": build_hud()
		"menu": show_menu()
		"map": show_map()
		"settings": show_settings(previous)
		"controls": show_controls(previous)
		"pause":
			screen = "game"
			pause_game()
		"results": _show_results()
		"credits": show_credits()
