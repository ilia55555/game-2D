extends Node3D
class_name HeroModel3D

var pelvis: Node3D
var torso: Node3D
var head_pivot: Node3D
var ear_left: Node3D
var ear_right: Node3D
var arm_front: Node3D
var forearm_front: Node3D
var arm_back: Node3D
var forearm_back: Node3D
var leg_front: Node3D
var shin_front: Node3D
var leg_back: Node3D
var shin_back: Node3D
var tail_1: Node3D
var tail_2: Node3D
var tail_3: Node3D
var gun_pivot: Node3D

var time := 0.0
var speed_ratio := 0.0
var vertical_speed := 0.0
var grounded := true
var crouching := false
var firing := 0.0

const TEAL := Color("20c8bd")
const TEAL_DARK := Color("0b6f73")
const FUR_LIGHT := Color("d7fff4")
const ARMOR := Color("202b38")
const METAL := Color("aab7c5")
const GOLD := Color("e2a92d")
const CYAN := Color("55fff1")
const VISOR := Color("071018")

func _ready() -> void:
	build_rig()

func set_motion(new_speed_ratio: float, new_vertical_speed: float, is_grounded: bool, is_crouching: bool, fire_pulse: float) -> void:
	speed_ratio = clampf(absf(new_speed_ratio), 0.0, 1.25)
	vertical_speed = new_vertical_speed
	grounded = is_grounded
	crouching = is_crouching
	firing = maxf(firing, fire_pulse)

func _process(delta: float) -> void:
	time += delta
	firing = maxf(0.0, firing - delta * 7.0)
	animate_pose()

func build_rig() -> void:
	pelvis = Node3D.new()
	pelvis.name = "Pelvis"
	add_child(pelvis)

	var hip := make_capsule("Hip", 0.42, 0.68, ARMOR)
	hip.scale.z = 0.72
	pelvis.add_child(hip)

	torso = Node3D.new()
	torso.name = "Torso"
	torso.position = Vector3(0, 0.52, 0)
	pelvis.add_child(torso)

	var chest := make_capsule("Chest", 0.52, 1.12, TEAL)
	chest.position.y = 0.38
	chest.scale.z = 0.72
	torso.add_child(chest)

	var chest_armor := make_box("ChestArmor", Vector3(0.74, 0.48, 0.28), ARMOR)
	chest_armor.position = Vector3(0.04, 0.34, 0.38)
	torso.add_child(chest_armor)

	var core := make_sphere("Core", 0.15, CYAN, true)
	core.position = Vector3(0.06, 0.35, 0.56)
	core.scale.z = 0.38
	torso.add_child(core)

	head_pivot = Node3D.new()
	head_pivot.name = "Head"
	head_pivot.position = Vector3(0.04, 1.28, 0)
	torso.add_child(head_pivot)

	var head := make_sphere("HeadMesh", 0.56, TEAL)
	head.scale = Vector3(1.0, 0.92, 0.78)
	head_pivot.add_child(head)

	var muzzle := make_sphere("Muzzle", 0.31, FUR_LIGHT)
	muzzle.position = Vector3(0.36, -0.10, 0.12)
	muzzle.scale = Vector3(1.15, 0.68, 0.60)
	head_pivot.add_child(muzzle)

	var visor := make_sphere("Visor", 0.40, VISOR, true)
	visor.position = Vector3(0.25, 0.10, 0.37)
	visor.scale = Vector3(0.96, 0.55, 0.30)
	head_pivot.add_child(visor)

	var eye := make_sphere("EyeGlow", 0.10, CYAN, true)
	eye.position = Vector3(0.42, 0.13, 0.63)
	eye.scale = Vector3(0.65, 1.20, 0.35)
	head_pivot.add_child(eye)

	ear_back_setup()
	ear_front_setup()
	build_scarf()
	build_arms()
	build_legs()
	build_tail()
	build_gun()

func ear_front_setup() -> void:
	ear_left = Node3D.new()
	ear_left.name = "EarFront"
	ear_left.position = Vector3(0.12, 0.42, 0.02)
	ear_left.rotation_degrees.z = -10
	head_pivot.add_child(ear_left)

	var ear := make_capsule("EarFrontMesh", 0.17, 1.15, TEAL)
	ear.position.y = 0.50
	ear.scale.z = 0.55
	ear_left.add_child(ear)

	var inner := make_capsule("EarFrontInner", 0.08, 0.78, FUR_LIGHT)
	inner.position = Vector3(0.02, 0.52, 0.10)
	inner.scale.z = 0.40
	ear_left.add_child(inner)

func ear_back_setup() -> void:
	ear_right = Node3D.new()
	ear_right.name = "EarBack"
	ear_right.position = Vector3(-0.24, 0.37, -0.15)
	ear_right.rotation_degrees.z = 15
	head_pivot.add_child(ear_right)

	var ear := make_capsule("EarBackMesh", 0.16, 1.08, TEAL_DARK)
	ear.position.y = 0.47
	ear.scale.z = 0.50
	ear_right.add_child(ear)

func build_scarf() -> void:
	var scarf_root := Node3D.new()
	scarf_root.name = "Scarf"
	scarf_root.position = Vector3(-0.25, 0.92, -0.25)
	torso.add_child(scarf_root)

	for i in range(3):
		var segment := make_capsule("Scarf%d" % i, 0.10, 0.52, GOLD)
		segment.position = Vector3(-0.24 - i * 0.34, -0.02 - i * 0.05, -0.02)
		segment.rotation_degrees.z = 70 + i * 7
		scarf_root.add_child(segment)

func build_arms() -> void:
	arm_back = create_limb_chain("ArmBack", Vector3(-0.34, 0.78, -0.30), 0.52, 0.50, TEAL_DARK, false)
	torso.add_child(arm_back)
	forearm_back = arm_back.get_node("Joint")

	arm_front = create_limb_chain("ArmFront", Vector3(0.36, 0.80, 0.32), 0.54, 0.52, TEAL, true)
	torso.add_child(arm_front)
	forearm_front = arm_front.get_node("Joint")

func build_legs() -> void:
	leg_back = create_leg_chain("LegBack", Vector3(-0.23, -0.17, -0.22), 0.62, 0.58, TEAL_DARK, false)
	pelvis.add_child(leg_back)
	shin_back = leg_back.get_node("Joint")

	leg_front = create_leg_chain("LegFront", Vector3(0.25, -0.17, 0.23), 0.62, 0.58, TEAL, true)
	pelvis.add_child(leg_front)
	shin_front = leg_front.get_node("Joint")

func build_tail() -> void:
	tail_1 = Node3D.new()
	tail_1.name = "Tail01"
	tail_1.position = Vector3(-0.46, 0.02, -0.18)
	tail_1.rotation_degrees.z = 62
	pelvis.add_child(tail_1)
	var s1 := make_capsule("Tail01Mesh", 0.21, 0.82, TEAL_DARK)
	s1.position.y = -0.33
	s1.scale.z = 0.65
	tail_1.add_child(s1)

	tail_2 = Node3D.new()
	tail_2.name = "Tail02"
	tail_2.position = Vector3(0, -0.68, 0)
	tail_1.add_child(tail_2)
	var s2 := make_capsule("Tail02Mesh", 0.19, 0.76, TEAL)
	s2.position.y = -0.31
	s2.scale.z = 0.62
	tail_2.add_child(s2)

	tail_3 = Node3D.new()
	tail_3.name = "Tail03"
	tail_3.position = Vector3(0, -0.62, 0)
	tail_2.add_child(tail_3)
	var s3 := make_capsule("Tail03Mesh", 0.16, 0.63, FUR_LIGHT)
	s3.position.y = -0.25
	s3.scale.z = 0.58
	tail_3.add_child(s3)

func build_gun() -> void:
	gun_pivot = Node3D.new()
	gun_pivot.name = "Gun"
	gun_pivot.position = Vector3(0.02, -0.50, 0.03)
	forearm_front.add_child(gun_pivot)

	var gun_body := make_box("GunBody", Vector3(0.72, 0.24, 0.30), METAL)
	gun_body.position = Vector3(0.34, -0.04, 0.13)
	gun_pivot.add_child(gun_body)

	var gun_dark := make_box("GunDark", Vector3(0.44, 0.18, 0.34), ARMOR)
	gun_dark.position = Vector3(0.22, -0.02, 0.15)
	gun_pivot.add_child(gun_dark)

	var barrel := make_cylinder("Barrel", 0.13, 0.40, ARMOR)
	barrel.position = Vector3(0.68, -0.03, 0.13)
	barrel.rotation_degrees.z = 90
	gun_pivot.add_child(barrel)

	var muzzle_glow := make_sphere("MuzzleGlow", 0.13, CYAN, true)
	muzzle_glow.position = Vector3(0.89, -0.03, 0.13)
	muzzle_glow.scale.z = 0.50
	gun_pivot.add_child(muzzle_glow)

func create_limb_chain(name_value: String, pos: Vector3, upper_len: float, lower_len: float, color: Color, front: bool) -> Node3D:
	var shoulder := Node3D.new()
	shoulder.name = name_value
	shoulder.position = pos
	shoulder.rotation_degrees.z = -20 if front else 18

	var upper := make_capsule(name_value + "Upper", 0.15, upper_len, color)
	upper.position.y = -upper_len * 0.44
	upper.scale.z = 0.72
	shoulder.add_child(upper)

	var joint := Node3D.new()
	joint.name = "Joint"
	joint.position.y = -upper_len * 0.86
	shoulder.add_child(joint)

	var lower := make_capsule(name_value + "Lower", 0.13, lower_len, color)
	lower.position.y = -lower_len * 0.44
	lower.scale.z = 0.68
	joint.add_child(lower)

	var hand := make_sphere(name_value + "Hand", 0.18, ARMOR)
	hand.position.y = -lower_len * 0.88
	hand.scale.z = 0.72
	joint.add_child(hand)
	return shoulder

func create_leg_chain(name_value: String, pos: Vector3, upper_len: float, lower_len: float, color: Color, front: bool) -> Node3D:
	var hip := Node3D.new()
	hip.name = name_value
	hip.position = pos
	hip.rotation_degrees.z = 2 if front else -2

	var thigh := make_capsule(name_value + "Thigh", 0.20, upper_len, color)
	thigh.position.y = -upper_len * 0.44
	thigh.scale.z = 0.78
	hip.add_child(thigh)

	var joint := Node3D.new()
	joint.name = "Joint"
	joint.position.y = -upper_len * 0.86
	hip.add_child(joint)

	var shin := make_capsule(name_value + "Shin", 0.17, lower_len, TEAL_DARK)
	shin.position.y = -lower_len * 0.44
	shin.scale.z = 0.76
	joint.add_child(shin)

	var foot := make_box(name_value + "Shoe", Vector3(0.48, 0.22, 0.42), GOLD)
	foot.position = Vector3(0.13, -lower_len * 0.87, 0.03)
	joint.add_child(foot)

	var sole := make_box(name_value + "Sole", Vector3(0.52, 0.08, 0.44), ARMOR)
	sole.position = Vector3(0.13, -lower_len * 0.99, 0.03)
	joint.add_child(sole)
	return hip

func animate_pose() -> void:
	var run_phase := time * lerpf(5.0, 12.0, minf(speed_ratio, 1.0))
	var stride := sin(run_phase) * 34.0 * minf(speed_ratio, 1.0)
	var counter := sin(run_phase + PI) * 34.0 * minf(speed_ratio, 1.0)
	var bob := absf(sin(run_phase * 2.0)) * 0.06 * minf(speed_ratio, 1.0)

	if crouching:
		pelvis.position.y = -0.38
		torso.rotation_degrees.z = -8
		leg_front.rotation_degrees.z = -48
		shin_front.rotation_degrees.z = 82
		leg_back.rotation_degrees.z = 38
		shin_back.rotation_degrees.z = -72
		arm_front.rotation_degrees.z = -84
		forearm_front.rotation_degrees.z = 92
		arm_back.rotation_degrees.z = 30
		forearm_back.rotation_degrees.z = -30
	elif not grounded:
		pelvis.position.y = 0.02
		torso.rotation_degrees.z = clampf(-vertical_speed / 1600.0 * 10.0, -9.0, 9.0)
		leg_front.rotation_degrees.z = -34 if vertical_speed < 0.0 else 18
		shin_front.rotation_degrees.z = 58 if vertical_speed < 0.0 else 16
		leg_back.rotation_degrees.z = 24 if vertical_speed < 0.0 else -20
		shin_back.rotation_degrees.z = -46 if vertical_speed < 0.0 else 34
		arm_front.rotation_degrees.z = -68
		forearm_front.rotation_degrees.z = 78
		arm_back.rotation_degrees.z = 42
		forearm_back.rotation_degrees.z = -42
	else:
		pelvis.position.y = bob
		torso.rotation_degrees.z = -3.0 * minf(speed_ratio, 1.0)
		leg_front.rotation_degrees.z = stride
		shin_front.rotation_degrees.z = maxf(0.0, -stride) * 0.72
		leg_back.rotation_degrees.z = counter
		shin_back.rotation_degrees.z = maxf(0.0, -counter) * 0.72
		arm_front.rotation_degrees.z = -counter * 0.72 - 18
		forearm_front.rotation_degrees.z = maxf(0.0, counter) * 0.42 + 18
		arm_back.rotation_degrees.z = -stride * 0.68 + 16
		forearm_back.rotation_degrees.z = maxf(0.0, stride) * 0.40 - 20

	if firing > 0.0:
		arm_front.rotation_degrees.z = -84 if crouching else -70
		forearm_front.rotation_degrees.z = 92 if crouching else 74
		gun_pivot.position.x = -0.05 * firing
	else:
		gun_pivot.position.x = lerpf(gun_pivot.position.x, 0.02, 0.18)

	head_pivot.rotation_degrees.z = sin(time * 2.1) * 2.4 - speed_ratio * 2.0
	ear_left.rotation_degrees.z = -10 + sin(time * 3.5) * 5.0 - speed_ratio * 7.0
	ear_right.rotation_degrees.z = 15 + sin(time * 3.2 + 0.7) * 4.0 - speed_ratio * 5.0

	tail_1.rotation_degrees.z = 62 + sin(time * 3.0) * 9.0 + speed_ratio * 9.0
	tail_2.rotation_degrees.z = sin(time * 3.0 + 0.7) * 13.0
	tail_3.rotation_degrees.z = sin(time * 3.0 + 1.4) * 17.0

func make_material(color: Color, emissive: bool = false) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.metallic = 0.10
	material.roughness = 0.42
	if emissive:
		material.emission_enabled = true
		material.emission = color
		material.emission_energy_multiplier = 2.2
	return material

func make_capsule(name_value: String, radius: float, height: float, color: Color) -> MeshInstance3D:
	var mesh := CapsuleMesh.new()
	mesh.radius = radius
	mesh.height = height
	var instance := MeshInstance3D.new()
	instance.name = name_value
	instance.mesh = mesh
	instance.material_override = make_material(color)
	return instance

func make_sphere(name_value: String, radius: float, color: Color, emissive: bool = false) -> MeshInstance3D:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	var instance := MeshInstance3D.new()
	instance.name = name_value
	instance.mesh = mesh
	instance.material_override = make_material(color, emissive)
	return instance

func make_box(name_value: String, size: Vector3, color: Color) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	var instance := MeshInstance3D.new()
	instance.name = name_value
	instance.mesh = mesh
	instance.material_override = make_material(color)
	return instance

func make_cylinder(name_value: String, radius: float, height: float, color: Color) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	var instance := MeshInstance3D.new()
	instance.name = name_value
	instance.mesh = mesh
	instance.material_override = make_material(color)
	return instance
