using UnityEngine;
namespace Velocity
{
    [DefaultExecutionOrder(20)]
    [RequireComponent(typeof(CharacterController))]
    public class PlayerMotor : MonoBehaviour
    {
        public const float Speed = 5.8f, JumpSpeed = 7.8f, Gravity = 18;
        public WorldSession World;
        public int Health = 8, MaxHealth = 8, Weapon;
        public float Energy = 100, Facing = 1;
        public Vector3 Velocity;
        public bool Dead { get; private set; }
        public bool Grounded => controller && controller.isGrounded;
        public bool Dashing => dashTime > 0;
        public bool Crouching { get; private set; }
        public float Charge { get; private set; }
        public float DashReady => Mathf.Clamp01(1 - dashCooldown / .8f);
        public ActorVisual Visual { get; private set; }
        CharacterController controller;
        float coyote, jumpBuffer, fireTime, invulnerable, dashTime, dashCooldown, knockback;
        int jumps = 2;
        public void Initialize(WorldSession world)
        {
            World = world; gameObject.layer = Layers.Player;
            controller = GetComponent<CharacterController>(); controller.radius = .15f; controller.height = .64f;
            controller.center = Vector3.up * .32f; controller.skinWidth = .015f; controller.stepOffset = .08f;
            controller.minMoveDistance = 0; controller.slopeLimit = 50;
            Visual = gameObject.AddComponent<ActorVisual>(); Visual.Initialize(world.Models, "hero", .8f, new Color(.25f,.7f,1));
            Visual.EquipWeapon(Weapon);
        }
        void Update()
        {
            if (!World || !World.Running || Dead) return;
            Tick(Time.deltaTime, World.App.Input);
        }
        public void Tick(float dt, GameInput input)
        {
            invulnerable -= dt; fireTime -= dt; dashCooldown -= dt; knockback -= dt; jumpBuffer -= dt;
            Energy = Mathf.Min(100, Energy + dt * 11);
            if (Grounded && Velocity.y <= 0) { coyote = .12f; jumps = 2; } else coyote -= dt;
            if (input.JumpPressed) jumpBuffer = .14f;
            if (Mathf.Abs(input.Move) > .1f && !Dashing) Facing = Mathf.Sign(input.Move);
            bool duck = input.Crouch && Grounded;
            if (Crouching && !duck)
            {
                Vector3 p = transform.position;
                duck = Physics.CheckCapsule(p + Vector3.up * .18f, p + Vector3.up * .49f, .145f, Layers.TerrainMask, QueryTriggerInteraction.Ignore);
            }
            Crouching = duck; controller.height = duck ? .42f : .64f; controller.center = Vector3.up * controller.height * .5f;
            if (input.SwitchPressed) SelectWeapon((Weapon + 1) % WeaponCatalog.Count);
            if (input.Weapon >= 0) SelectWeapon(input.Weapon);
            if (input.DashPressed && dashCooldown <= 0)
            { dashTime = .19f; dashCooldown = .8f; World.App.Audio.Play("dash"); Visual.Trigger("Dash"); }
            if (jumpBuffer > 0 && jumps > 0)
            {
                if (coyote > 0) jumps = 2; else if (jumps == 2) jumps = 1;
                Velocity.y = JumpSpeed * (jumps == 2 ? 1 : .9f); jumps--; jumpBuffer = 0; coyote = 0;
                World.App.Audio.Play("jump"); Visual.Trigger("Jump");
            }
            if (input.JumpReleased && Velocity.y > 2.2f) Velocity.y *= .55f;
            if (Dashing) { dashTime -= dt; Velocity = new Vector3(Facing * 9.5f, 0, 0); }
            else
            {
                Velocity.y = Grounded && Velocity.y < 0 ? -.8f : Mathf.Max(-10.5f, Velocity.y - Gravity * dt);
                if (knockback <= 0) Velocity.x = Mathf.MoveTowards(Velocity.x, input.Move * (duck ? 1.5f : Speed), (Grounded ? 32 * World.Data.friction : 21) * dt);
            }
            CarryPlatform();
            var flags = controller.Move(Velocity * dt);
            if ((flags & CollisionFlags.Above) != 0 && Velocity.y > 0) Velocity.y = 0;
            if ((flags & CollisionFlags.Sides) != 0) dashTime = 0;
            var position = transform.position; position.z = 0; position.x = Mathf.Clamp(position.x, .2f, World.Data.length / 100 - .2f); transform.position = position;
            Visual.Pose(Facing, Velocity, Grounded, Crouching, Dashing);
            if (Weapon == (int)WeaponKind.ChargeLaser)
            {
                if (input.Fire && fireTime <= 0) Charge = Mathf.Min(1, Charge + dt / WeaponCatalog.ChargeSeconds);
                if (input.FireReleased && Charge > 0 && fireTime <= 0) { Shoot(); Charge = 0; }
            }
            else if (input.Fire && fireTime <= 0) Shoot();
            Visual.SetCharge(Charge);
            if (transform.position.y < World.Data.killY) Die();
        }
        void CarryPlatform()
        {
            if (Velocity.y > .1f) return;
            if (Physics.Raycast(transform.position + Vector3.up * .08f, Vector3.down, out var hit, .18f, Layers.TerrainMask))
            {
                var platform = hit.collider.GetComponent<PlatformMotion>();
                if (platform) { controller.Move(platform.Delta); platform.StandOn(); }
            }
        }
        public void Shoot()
        {
            if (Dead || !World.Running || fireTime > 0) return;
            int actual = WeaponCatalog.Resolve(Weapon, Energy);
            var spec = WeaponCatalog.Get(actual);
            Vector3 origin = Visual.Muzzle;
            // A barrel next to a wall must not spawn a projectile on the other side of that wall.
            var chest = transform.position + Vector3.up * (Crouching ? .3f : .47f);
            if (Physics.Linecast(chest, origin, out var wall, Layers.TerrainMask)) origin = wall.point - (origin - chest).normalized * .03f;
            Vector3 direction = Vector3.right * Facing;
            int damage = actual == (int)WeaponKind.ChargeLaser ? Mathf.RoundToInt(Mathf.Lerp(3, spec.Damage, Charge)) : spec.Damage;
            for (int i = 0; i < spec.Pellets; i++)
                World.Shoot(origin, Quaternion.Euler(0, 0, (i - (spec.Pellets - 1) * .5f) * 7) * direction * spec.Speed, true, damage, spec.Projectile);
            Energy = Mathf.Max(0, Energy - spec.Cost); fireTime = spec.Interval;
            Visual.Trigger("Fire"); World.Effect(origin, spec.Color, .1f); World.App.Audio.Play("shoot", 1 + actual * .08f, .55f);
        }
        public void SelectWeapon(int index)
        {
            int next = Mathf.Clamp(index, 0, WeaponCatalog.Count - 1);
            if (next == Weapon) return;
            Weapon = next; Charge = 0; Visual.EquipWeapon(Weapon);
        }
        public void Damage(int amount, Vector3 source)
        {
            if (Dead || !World.Running || invulnerable > 0 || Dashing) return;
            Health = Mathf.Max(0, Health - amount); invulnerable = World.App.Save.Data.assist ? 2 : 1.25f;
            knockback = .23f; Velocity = new Vector3(transform.position.x >= source.x ? 3.3f : -3.3f, 2.4f, 0);
            Visual.Flash(); World.Camera.Shake(.09f); World.App.Audio.Play("hit");
            if (Health <= 0) Die();
        }
        public void Protect(float seconds) => invulnerable = seconds;
        public void Spring(float power = 9) { Velocity.y = power; jumps = 1; coyote = 0; dashTime = 0; World.App.Audio.Play("spring"); }
        public void Die()
        {
            if (Dead) return; Dead = true; Charge = 0; controller.enabled = false; Visual.Trigger("Death"); World.PlayerDied();
        }
        public void Teleport(Vector3 point)
        {
            controller.enabled = false; transform.position = new Vector3(point.x, point.y, 0); controller.enabled = true; Velocity = Vector3.zero;
        }
    }
}
