using UnityEngine;

namespace ProjectVelocity
{
    public sealed class GameBootstrap : MonoBehaviour
    {
        private static Material _playerMaterial;
        private static Material _enemyMaterial;
        private static Material _groundMaterial;
        private static Material _backgroundMaterial;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void EnsureGameExists()
        {
            // Never create the training world alongside the AERO campaign if
            // somebody imports these sample scripts into the main project.
            if (Resources.Load<TextAsset>("Velocity/campaign") != null ||
                FindFirstObjectByType<GameBootstrap>() != null)
            {
                return;
            }

            new GameObject("Game Bootstrap").AddComponent<GameBootstrap>();
        }

        private void Awake()
        {
            BuildMaterials();
            BuildLighting();
            BuildWorld();
            GameObject player = BuildPlayer();
            BuildCamera(player.transform);
            BuildTargets();
            BuildHud();
        }

        private static void BuildMaterials()
        {
            _playerMaterial = CreateMaterial("Player Glow", new Color(0.2f, 0.95f, 1f), 2.5f);
            _enemyMaterial = CreateMaterial("Enemy Glow", new Color(1f, 0.2f, 0.4f), 1.7f);
            _groundMaterial = CreateMaterial("Ground", new Color(0.08f, 0.12f, 0.2f), 0.2f);
            _backgroundMaterial = CreateMaterial("Background", new Color(0.08f, 0.2f, 0.28f), 0.8f);
        }

        private static Material CreateMaterial(string name, Color color, float emission)
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null)
            {
                shader = Shader.Find("Standard");
            }

            Material material = new Material(shader) { name = name, color = color };
            material.EnableKeyword("_EMISSION");
            material.SetColor("_EmissionColor", color * emission);
            return material;
        }

        private static void BuildLighting()
        {
            RenderSettings.ambientLight = new Color(0.08f, 0.12f, 0.2f);

            GameObject lightObject = new GameObject("Moon Light");
            Light light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(0.55f, 0.72f, 1f);
            light.intensity = 1.25f;
            light.shadows = LightShadows.Soft;
            lightObject.transform.rotation = Quaternion.Euler(35f, -25f, 0f);
        }

        private static void BuildWorld()
        {
            Camera.main?.gameObject.SetActive(false);

            CreateBlock("Ground", new Vector3(0f, -1.35f, 0f), new Vector3(32f, 1f, 3f), _groundMaterial, true);
            CreateBlock("Platform Left", new Vector3(-6f, 0.15f, 0f), new Vector3(4f, 0.45f, 2.5f), _groundMaterial, true);
            CreateBlock("Platform Right", new Vector3(6.5f, 1f, 0f), new Vector3(4.5f, 0.45f, 2.5f), _groundMaterial, true);

            for (int index = 0; index < 18; index++)
            {
                GameObject mote = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                mote.name = "Background Mote";
                mote.transform.position = new Vector3(-14f + index * 1.7f, -0.2f + (index % 5) * 1.2f, 4f + index % 3);
                mote.transform.localScale = Vector3.one * (0.12f + (index % 3) * 0.06f);
                mote.GetComponent<Renderer>().sharedMaterial = _backgroundMaterial;
                Destroy(mote.GetComponent<Collider>());
            }
        }

        private static GameObject BuildPlayer()
        {
            GameObject player = new GameObject("Player");
            player.transform.position = new Vector3(-4f, 0f, 0f);

            Rigidbody body = player.AddComponent<Rigidbody>();
            body.mass = 1f;
            body.interpolation = RigidbodyInterpolation.Interpolate;
            body.collisionDetectionMode = CollisionDetectionMode.Continuous;
            body.constraints = RigidbodyConstraints.FreezePositionZ | RigidbodyConstraints.FreezeRotation;

            CapsuleCollider collider = player.AddComponent<CapsuleCollider>();
            collider.height = 1.8f;
            collider.radius = 0.42f;

            GameObject visualPrefab = Resources.Load<GameObject>("Characters/PlayerModel");
            GameObject visual = visualPrefab != null
                ? Instantiate(visualPrefab)
                : GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = visualPrefab != null ? "Player Model" : "Character Model Placeholder";
            visual.transform.SetParent(player.transform, false);

            if (visualPrefab == null)
            {
                visual.transform.localScale = new Vector3(0.8f, 0.9f, 0.8f);
                visual.GetComponent<Renderer>().sharedMaterial = _playerMaterial;
            }

            RemoveColliders(visual);

            Transform socketParent = FindRightHand(visual) ?? visual.transform;
            Transform weaponSocket = new GameObject("Right Hand Weapon Socket").transform;
            weaponSocket.SetParent(socketParent, false);
            weaponSocket.localPosition = socketParent == visual.transform ? new Vector3(0.55f, 0.15f, 0f) : Vector3.zero;

            GameObject weaponPrefab = Resources.Load<GameObject>("Weapons/PlayerWeapon");
            GameObject weapon = weaponPrefab != null
                ? Instantiate(weaponPrefab)
                : GameObject.CreatePrimitive(PrimitiveType.Cube);
            weapon.name = weaponPrefab != null ? "Player Weapon" : "Weapon Model Placeholder";
            weapon.transform.SetParent(weaponSocket, false);
            if (weaponPrefab == null)
            {
                weapon.transform.localPosition = new Vector3(0.32f, 0f, 0f);
                weapon.transform.localScale = new Vector3(0.65f, 0.12f, 0.12f);
                weapon.GetComponent<Renderer>().sharedMaterial = _backgroundMaterial;
            }

            RemoveColliders(weapon);

            PlayerController controller = player.AddComponent<PlayerController>();
            PlayerCombat combat = player.AddComponent<PlayerCombat>();
            combat.Configure(weaponSocket);
            controller.Configure(visual.transform, combat);
            player.AddComponent<ProceduralAudio>();
            return player;
        }

        private static Transform FindRightHand(GameObject visual)
        {
            Animator animator = visual.GetComponentInChildren<Animator>();
            if (animator == null || animator.avatar == null || !animator.avatar.isValid || !animator.avatar.isHuman)
            {
                return null;
            }

            return animator.GetBoneTransform(HumanBodyBones.RightHand);
        }

        private static void RemoveColliders(GameObject root)
        {
            foreach (Collider childCollider in root.GetComponentsInChildren<Collider>())
            {
                Destroy(childCollider);
            }
        }

        private static void BuildCamera(Transform target)
        {
            GameObject cameraObject = new GameObject("2.5D Camera");
            Camera camera = cameraObject.AddComponent<Camera>();
            cameraObject.AddComponent<AudioListener>();
            camera.orthographic = true;
            camera.orthographicSize = 5.2f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.015f, 0.025f, 0.06f);
            cameraObject.tag = "MainCamera";
            cameraObject.transform.position = new Vector3(target.position.x, 1.2f, -12f);
            CameraFollow follow = cameraObject.AddComponent<CameraFollow>();
            follow.Configure(target);
        }

        private static void BuildTargets()
        {
            CreateTarget(new Vector3(2.5f, -0.35f, 0f));
            CreateTarget(new Vector3(7f, 2.15f, 0f));
        }

        private static void CreateTarget(Vector3 position)
        {
            GameObject target = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            target.name = "Training Target";
            target.transform.position = position;
            target.GetComponent<Renderer>().sharedMaterial = _enemyMaterial;
            target.AddComponent<DamageableTarget>();
        }

        private static void BuildHud()
        {
            new GameObject("HUD").AddComponent<GameHud>();
        }

        private static GameObject CreateBlock(string name, Vector3 position, Vector3 scale, Material material, bool collider)
        {
            GameObject block = GameObject.CreatePrimitive(PrimitiveType.Cube);
            block.name = name;
            block.transform.position = position;
            block.transform.localScale = scale;
            block.GetComponent<Renderer>().sharedMaterial = material;
            if (!collider)
            {
                Destroy(block.GetComponent<Collider>());
            }

            return block;
        }
    }
}
