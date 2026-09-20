using UnityEngine;
namespace Velocity
{
    public class BossActor : MonoBehaviour
    {
        public WorldSession World;
        public int Health { get; private set; }
        public int MaxHealth { get; private set; }
        public bool Active { get; private set; }
        public bool Defeated { get; private set; }
        public string State { get; private set; } = "dormant";
        public int Phase { get; private set; } = 1;
        static readonly int[][] Cycles = { new[]{0,1,2}, new[]{0,3,1,4}, new[]{3,0,4}, new[]{2,1,0,2}, new[]{0,1,3,2,4} };
        CharacterController body;
        ActorVisual visual;
        Vector3 velocity, locked;
        float timer, clock, direction = -1, ringTimer;
        int attack, attackNumber;
        bool airborne;
        GameObject warnings;
        public void Initialize(WorldSession world)
        {
            World = world; MaxHealth = new[] {60,72,84,96,128}[world.Index];
            if (world.App.Save.Data.assist) MaxHealth = (int)(MaxHealth * .72f);
            Health = MaxHealth; gameObject.layer = Layers.Enemy;
            body = gameObject.AddComponent<CharacterController>(); body.height = 1.5f; body.radius = .7f;
            body.center = Vector3.up * .75f; body.skinWidth = .015f; body.stepOffset = .08f; body.minMoveDistance = 0;
            visual = gameObject.AddComponent<ActorVisual>(); visual.Initialize(world.Models, world.Data.bossArt, 2.6f, world.Data.Accent);
        }
        public void Activate()
        {
            if (Active || Defeated) return; Active = true; SetState("intro", 1.7f);
            World.Banner = World.Data.bossName; World.App.Audio.Music("boss"); World.App.Audio.Play("alarm");
        }
        void SetState(string state, float seconds)
        {
            State = state; timer = seconds;
            visual.Bool("Shielded", state == "recover");
            if (state != "telegraph" && warnings) { Destroy(warnings); warnings = null; }
        }
        void Update()
        {
            if (!World.Running || !Active || Defeated || !World.Player || World.Player.Dead) return;
            float dt = Time.deltaTime; clock += dt; timer -= dt;
            bool flying = World.Index == 1 || World.Index == 2;
            if (flying)
            {
                if (State != "attack") velocity.y = ((.7f + Mathf.Sin(clock * 1.5f) * .25f) - transform.position.y) * 5;
            }
            else velocity.y = body.isGrounded && velocity.y < 0 ? -.8f : Mathf.Max(-10, velocity.y - 18 * dt);
            switch (State)
            {
                case "intro": if (timer <= 0) SetState("idle", .7f); break;
                case "idle":
                    velocity.x = Mathf.MoveTowards(velocity.x, 0, 12 * dt);
                    if (timer <= 0) Prepare(); break;
                case "telegraph":
                    velocity.x = Mathf.MoveTowards(velocity.x, 0, 14 * dt);
                    if (timer <= 0) Execute(); break;
                case "attack":
                    if (attack == 4)
                    {
                        ringTimer -= dt;
                        if (ringTimer <= 0)
                        {
                            ringTimer = .18f; var origin = visual.Muzzle;
                            var aim = (World.Player.transform.position + Vector3.up * .4f - origin).normalized;
                            World.Shoot(origin, Quaternion.Euler(0,0,Mathf.Sin(clock * 5) * 17.2f) * aim * 3.5f, false, 1, "boss_bolt");
                        }
                    }
                    if (attack == 2 && airborne && body.isGrounded && velocity.y <= 0) { airborne = false; Slam(); }
                    // A slam stays active until landing, even if its nominal timer has elapsed.
                    if (timer <= 0 && !(attack == 2 && airborne)) SetState("recover", Phase == 1 ? .8f : .55f);
                    break;
                case "recover":
                    velocity.x = Mathf.MoveTowards(velocity.x, 0, 11 * dt);
                    if (timer <= 0) SetState("idle", Phase == 1 ? .45f : .22f); break;
            }
            body.Move(velocity * dt);
            float left = World.Data.arena / 100 + 1, right = World.Data.length / 100 - 1.6f;
            var p = transform.position; p.x = Mathf.Clamp(p.x, left, right); p.z = 0; transform.position = p;
            if (attack == 1 && State == "attack" && (p.x <= left + .05f || p.x >= right - .05f)) timer = 0;
            var diff = World.Player.transform.position - p;
            if (Mathf.Abs(diff.x) < .95f && diff.y > -.25f && diff.y < 1.55f)
                World.Player.Damage(World.App.Save.Data.assist ? 1 : 2, p);
            visual.Pose(direction, velocity, body.isGrounded, false, false);
        }
        void Prepare()
        {
            var cycle = Cycles[World.Index]; attack = cycle[attackNumber++ % cycle.Length];
            locked = World.Player.transform.position; direction = locked.x >= transform.position.x ? 1 : -1;
            SetState("telegraph", World.App.Save.Data.assist ? 1.05f : Phase == 1 ? .85f : .65f);
            visual.Trigger("Telegraph"); warnings = new GameObject("Attack warning"); warnings.transform.SetParent(World.transform, false);
            if (attack == 3)
                for (int k = -2; k <= 2; k++)
                    Geometry.Box("Rain warning", warnings.transform, new Vector3(RainX(k), 2.3f, 0), new Vector3(.06f,4.6f,.06f), new Color(1,.7f,.15f));
            else
                Geometry.Box(attack == 1 ? "Charge warning" : "Attack warning", warnings.transform,
                    transform.position + new Vector3(direction * 1.5f,.12f,0), new Vector3(attack == 1 ? 3 : 1,.08f,.5f), new Color(1,.7f,.15f));
        }
        float RainX(int k) => Mathf.Clamp(locked.x + k * 1.4f, World.Data.arena / 100 + .65f, World.Data.length / 100 - 1.25f);
        void Execute()
        {
            Vector3 origin = visual.Muzzle, aim = (locked + Vector3.up * .35f - origin).normalized;
            visual.Trigger(attack == 4 ? "Special" : attack == 2 ? "Slam" : "Attack");
            switch (attack)
            {
                case 0:
                    int count = Phase == 1 ? 5 : 7;
                    for (int i = 0; i < count; i++) World.Shoot(origin, Quaternion.Euler(0,0,(i-(count-1)*.5f)*9.74f) * aim * (Phase == 1 ? 2.9f : 3.4f), false, 1, "boss_bolt");
                    SetState("attack", .35f); break;
                case 1: velocity = new Vector3(direction * (Phase == 1 ? 5.7f : 6.9f),0,0); SetState("attack",1.2f); break;
                case 2: velocity = new Vector3(direction * 1.7f,6.5f,0); airborne = true; SetState("attack",1); break;
                case 3:
                    for (int k = -2; k <= 2; k++) World.Shoot(new Vector3(RainX(k),4.6f,0), Vector3.down * 3.4f, false,1,"boss_bolt");
                    SetState("attack", .8f); break;
                case 4: velocity = Vector3.zero; ringTimer = 0; SetState("attack", 1.6f); break;
            }
            World.App.Audio.Play("shoot",.65f,.8f);
        }
        void Slam()
        {
            World.Camera.Shake(.14f); World.App.Audio.Play("explode",.6f);
            for (int d = -1; d <= 1; d += 2)
                World.Shoot(transform.position + new Vector3(d*1.1f,.12f,0), Vector3.right * d * 4.5f,false,1,"boss_bolt");
        }
        public void Hit(int amount)
        {
            if (!Active || Defeated || State == "intro" || State == "recover") return;
            Health = Mathf.Max(0, Health - amount); visual.Flash();
            if (Phase == 1 && Health <= MaxHealth / 2) { Phase = 2; World.Banner = "CORE OVERLOAD"; }
            if (Health > 0) return;
            Defeated = true; Active = false; body.enabled = false;
            if (warnings) Destroy(warnings);
            visual.Trigger("Death"); World.BossDied(); Destroy(gameObject, 1);
        }
        void OnDestroy() { if (warnings) Destroy(warnings); }
    }
}
