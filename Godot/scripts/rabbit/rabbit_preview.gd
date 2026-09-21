extends Node2D

@onready var rabbit: RabbitRig = $RabbitRig

func _process(_delta: float) -> void:
	var left := Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)
	var right := Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT)
	var moving := left or right
	var look_left := left and not right
	if Input.is_key_pressed(KEY_SPACE):
		rabbit.set_motion(RabbitRig.Motion.JUMP, Vector2(0, -600), look_left)
	elif Input.is_key_pressed(KEY_F):
		rabbit.set_motion(RabbitRig.Motion.SHOOT, Vector2.ZERO, look_left)
	elif moving:
		rabbit.set_motion(RabbitRig.Motion.RUN, Vector2(-300 if look_left else 300, 0), look_left)
	else:
		rabbit.set_motion(RabbitRig.Motion.IDLE, Vector2.ZERO, rabbit.facing_left)
