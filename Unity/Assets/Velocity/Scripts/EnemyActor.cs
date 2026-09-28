using UnityEngine;
namespace Velocity
{
    public class EnemyActor : MonoBehaviour
    {
        public WorldSession World;
        public string Kind;
        public int TerritoryId = -1;
        int pressure=1;
        string behavior;
        float frozenUntil;
        public bool Frozen => Time.time < frozenUntil;
        public int Health { get; private set; }
        CharacterController body;
        ActorVisual visual;
        Vector3 home, velocity;
        float clock, attackTimer = 1.6f, warning, facing = -1, lastDashHit = -10;
        bool pending, dying;
        public void Initialize(WorldSession world, string kind, int localPressure=1)
        {
            World = world; Kind = kind; pressure=Mathf.Clamp(localPressure,1,3); home = transform.position; clock = home.x;
            behavior = kind switch {
                "bee" or "vulture" or "ice_drone" or "fire_bat" => "drone",
                "mushroom" or "fire_imp" => "hopper", "wolf" or "ice_wolf" => "sentinel",
                "scorpion" => "crawler", "robot" => "sentinel", _ => kind };
            Health = behavior == "sentinel" ? 8 : behavior == "turret" ? 6 : behavior == "drone" ? 4 : 5;
            Health+=pressure-1;
            if (World.App.Save.Data.assist) Health = Mathf.Max(1, Health - 1);
            gameObject.layer = Layers.Enemy; body = gameObject.AddComponent<CharacterController>();
            body.radius = .25f; body.height = behavior == "sentinel" ? .74f : .52f; body.center = Vector3.up * body.height / 2;
            body.skinWidth = .01f; body.stepOffset = .08f; body.minMoveDistance = 0;
            visual = gameObject.AddComponent<ActorVisual>(); visual.Initialize(world.Models, kind, kind == "sentinel" ? 1.18f : .96f, new Color(.65f,.36f,.24f));
            attackTimer += Mathf.Repeat(home.x, 2.5f);
        }
        void Update()
        {
            if (dying || !World.Running || !World.Player || World.Player.Dead) return;
            var target = World.Player; if (Mathf.Abs(target.transform.position.x - transform.position.x) > 12) return;
            float dt = Time.deltaTime;
            visual.SetAnimationSpeed(Frozen ? 0 : 1);
            if (Frozen) return;
            clock += dt; attackTimer -= dt;
            if (behavior == "drone")
            {
                var dest = home + new Vector3(Mathf.Sin(clock * .65f) * 1.1f, Mathf.Sin(clock * 2) * .27f, 0);
                body.Move(dest - transform.position); facing = Mathf.Sign(target.transform.position.x - transform.position.x);
            }
            else
            {
                velocity.y = body.isGrounded && velocity.y < 0 ? -.8f : Mathf.Max(-10, velocity.y - 18 * dt);
                if (behavior == "turret") { velocity.x = 0; facing = Mathf.Sign(target.transform.position.x - transform.position.x); }
                else
                {
                    if (body.isGrounded)
                    {
                        var probe = transform.position + new Vector3(facing * .5f, .12f, 0);
                        if (!Physics.Raycast(probe, Vector3.down, .8f, Layers.TerrainMask) || Mathf.Abs(transform.position.x - home.x) > 1.05f)
                            facing = Mathf.Abs(transform.position.x - home.x) > 1.05f ? Mathf.Sign(home.x - transform.position.x) : -facing;
                        if (behavior == "hopper" && Mathf.Sin(clock * 2.1f) > .97f) velocity.y = 4.9f;
                    }
                    velocity.x = facing * (behavior == "sentinel" ? 1.1f : .9f);
                }
                var flags = body.Move(velocity * dt); if ((flags & CollisionFlags.Sides) != 0) facing = -facing;
            }
            var pos = transform.position; pos.z = 0; transform.position = pos;
            if (pending) { warning -= dt; if (warning <= 0) { pending = false; Shoot(); } }
            else if (attackTimer <= 0 && Vector3.Distance(target.transform.position, transform.position) < 6.6f)
            {
                if ((behavior == "turret" || behavior == "drone" || behavior == "sentinel") &&
                    !Physics.Linecast(transform.position + Vector3.up * .38f, target.transform.position + Vector3.up * .32f, Layers.TerrainMask))
                { pending = true; warning = .85f-(pressure-1)*.12f; visual.Trigger("Telegraph"); }
                attackTimer = (behavior == "drone" ? 3.3f : 3.8f)-(pressure-1)*.5f;
            }
            Vector3 diff = target.transform.position - transform.position;
            if (Mathf.Abs(diff.x) < .48f && Mathf.Abs(diff.y) < .6f)
            {
                if (target.Velocity.y < -1.6f && diff.y > .4f && behavior != "turret") { Hit(3); target.Spring(4.3f); }
                else if (target.Dashing && Time.time - lastDashHit > .3f) { lastDashHit = Time.time; Hit(4); }
                else if (!target.Dashing) target.Damage(1, transform.position);
            }
            visual.Pose(facing, velocity, body.isGrounded, false, false);
            if (transform.position.y < World.Data.killY) Hit(100);
        }
        void Shoot()
        {
            Vector3 origin = visual.Muzzle; Vector3 direction = (World.Player.transform.position + Vector3.up * .3f - origin).normalized;
            if (behavior == "sentinel") for (int i = -1; i <= 1; i++) World.Shoot(origin, Quaternion.Euler(0,0,i * 7.45f) * direction * 2.8f, false, 1, "enemy_bolt");
            else World.Shoot(origin, direction * (World.App.Save.Data.assist ? 2.6f : 3.3f), false, 1, "enemy_bolt");
            visual.Trigger("Attack");
        }
        public void Hit(int amount)
        {
            if (dying) return; Health -= amount; visual.Flash();
            if (Health > 0) return; dying = true; body.enabled = false; visual.SetAnimationSpeed(1); visual.Trigger("Death");
            World.Score += 250; World.Kills++; World.App.Audio.Play("explode", 1.2f, .55f);
            if (World.Kills % 5 == 0) World.AddPickup(transform.position + Vector3.up * .3f, "heal");
            Destroy(gameObject, .4f);
        }
        public void Freeze(float seconds) { if (!dying) { frozenUntil = Mathf.Max(frozenUntil, Time.time + seconds); visual.Flash(); } }
    }
}
