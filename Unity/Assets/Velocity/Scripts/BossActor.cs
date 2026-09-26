using UnityEngine;
namespace Velocity
{
    // All attacks have a readable warning, an active window and a vulnerable recovery.
    public class BossActor : MonoBehaviour
    {
        public WorldSession World;
        public int Health { get; private set; }
        public int MaxHealth { get; private set; }
        public bool Active { get; private set; }
        public bool Defeated { get; private set; }
        public string State { get; private set; } = "dormant";
        public int Phase { get; private set; } = 1;
        public bool IsFinal { get; private set; }
        public string DisplayName => IsFinal ? "VEXAR / " + new[] {"FERAL","ARMOURED","ASCENDED"}[Phase-1] : World.Data.bossName;
        // 0 fan, 1 charge, 2 slam, 3 rain, 4 sweeping barrage, 5 aerial dive.
        static readonly int[][] Cycles = {
            new[]{2,1,2,0}, new[]{0,3,1,0}, new[]{5,0,3,5},
            new[]{2,0,1,2}, new[]{1,4,0,1}, new[]{1,3,1,4,2}
        };
        static readonly int[][] FinalCycles = {new[]{1,2,0},new[]{3,4,1,2},new[]{5,4,3,2,0}};
        static readonly string[] Families = {"boss_rock","boss_poison","boss_feather","boss_ice","boss_fire","boss_bolt"};
        CharacterController body;
        ActorVisual visual;
        Vector3 velocity, locked;
        float timer, clock, direction = -1, shotTimer, slowUntil, airTime;
        int attack, attackNumber;
        bool airborne;
        GameObject warnings;
        bool Flying => World.Index == 2 || (IsFinal && Phase == 3);
        string Family => IsFinal ? "vexar_bolt" : Families[World.Index];
        public void Initialize(WorldSession world)
        {
            World=world; IsFinal=world.FinalEncounter;
            MaxHealth=IsFinal ? 240 : world.Data.bossHealth;
            if (world.App.Save.Data.assist) MaxHealth=Mathf.RoundToInt(MaxHealth*.72f);
            Health=MaxHealth; gameObject.layer=Layers.Enemy;
            body=gameObject.AddComponent<CharacterController>(); body.height=1.5f; body.radius=.62f;
            body.center=Vector3.up*.75f; body.skinWidth=.015f; body.stepOffset=.08f; body.minMoveDistance=0;
            visual=gameObject.AddComponent<ActorVisual>(); SetVisual();
        }
        void SetVisual()
        {
            string id=IsFinal ? new[]{"vexar_feral","vexar_armored","vexar_final"}[Phase-1] : World.Data.bossArt;
            visual.Initialize(World.Models,id,IsFinal ? 2.1f+Phase*.15f : 2.3f,IsFinal ? new Color(.8f,.13f,.28f) : World.Data.Accent);
        }
        public void Activate()
        {
            if (Active || Defeated) return;
            Active=true; SetState("intro",1.8f); World.Banner=DisplayName;
            World.App.Audio.Music("boss"); World.App.Audio.Play("alarm");
        }
        void SetState(string state,float seconds)
        {
            State=state; timer=seconds; visual.Bool("Shielded",state == "intro" || state == "transform");
            if (state != "telegraph" && warnings) { Destroy(warnings); warnings=null; }
        }
        void Update()
        {
            if (!World.Running || !Active || Defeated || !World.Player || World.Player.Dead) return;
            float scale=Time.time < slowUntil ? .7f : 1;
            float dt=Time.deltaTime*scale; visual.SetAnimationSpeed(scale); clock+=dt; timer-=dt;
            if (Flying && !airborne)
                velocity.y=((1.05f+Mathf.Sin(clock*1.5f)*.25f)-transform.position.y)*4;
            else velocity.y=body.isGrounded && velocity.y<0 ? -.8f : Mathf.Max(-12,velocity.y-18*dt);
            switch (State)
            {
                case "intro": case "transform":
                    velocity.x=0;
                    if (timer<=0) SetState("idle",.65f);
                    break;
                case "idle":
                    velocity.x=Mathf.MoveTowards(velocity.x,0,14*dt);
                    if (timer<=0) Prepare(); break;
                case "telegraph":
                    velocity.x=Mathf.MoveTowards(velocity.x,0,18*dt);
                    if (timer<=0) Execute(); break;
                case "attack":
                    if (attack==4)
                    {
                        shotTimer-=dt;
                        if (shotTimer<=0)
                        {
                            shotTimer=Phase==3 ? .2f : .28f;
                            var origin=visual.Muzzle; var aim=(locked+Vector3.up*.4f-origin).normalized;
                            World.Shoot(origin,Quaternion.Euler(0,0,Mathf.Sin(clock*4)*20)*aim*3.8f,false,1,Family);
                        }
                    }
                    if (airborne)
                    {
                        airTime+=dt;
                        if (airTime>.15f && body.isGrounded && velocity.y<=0)
                        { airborne=false; Slam(); timer=0; }
                        // Avoid an endless attack if an authored collision surface is missing.
                        if (airTime>3) { airborne=false; timer=0; }
                    }
                    if (timer<=0 && !airborne) SetState("recover",Phase==1 ? .95f : .72f);
                    break;
                case "recover":
                    velocity.x=Mathf.MoveTowards(velocity.x,0,15*dt);
                    if (timer<=0) SetState("idle",Phase==1 ? .5f : .3f); break;
            }
            body.Move(velocity*dt);
            float left=World.Data.arena/100+1, right=World.Data.length/100-1.6f;
            var p=transform.position; p.x=Mathf.Clamp(p.x,left,right); p.z=0; transform.position=p;
            if (attack==1 && State=="attack" && (p.x<=left+.05f || p.x>=right-.05f)) timer=0;
            var diff=World.Player.transform.position-p;
            if (State!="intro" && State!="transform" && Mathf.Abs(diff.x)<.82f && diff.y>-.3f && diff.y<1.5f)
                World.Player.Damage(World.App.Save.Data.assist ? 1 : 2,p);
            visual.Pose(direction,velocity,body.isGrounded,false,State=="attack" && attack==1);
        }
        void Prepare()
        {
            var cycle=IsFinal ? FinalCycles[Phase-1] : Cycles[World.Index];
            attack=cycle[attackNumber++%cycle.Length]; locked=World.Player.transform.position;
            direction=locked.x>=transform.position.x ? 1 : -1;
            SetState("telegraph",World.App.Save.Data.assist ? 1.15f : Phase==1 ? .95f : .75f);
            visual.Trigger("Telegraph"); warnings=new GameObject("Attack warning"); warnings.transform.SetParent(World.transform,false);
            if (attack==3)
                for (int k=-2;k<=2;k++) Geometry.Box("Rain lane",warnings.transform,new Vector3(RainX(k),2.3f,0),new Vector3(.07f,4.6f,.07f),Color.yellow);
            else if (attack==5)
                Geometry.Box("Dive target",warnings.transform,new Vector3(locked.x,.08f,0),new Vector3(1.3f,.09f,.7f),Color.yellow);
            else
                Geometry.Box(attack==1 ? "Charge path" : "Attack warning",warnings.transform,
                    transform.position+new Vector3(direction*1.8f,.13f,0),new Vector3(attack==1 ? 3.6f : 1,.09f,.5f),Color.yellow);
        }
        float RainX(int k) => Mathf.Clamp(locked.x+k*1.5f,World.Data.arena/100+.7f,World.Data.length/100-1.3f);
        void Execute()
        {
            var origin=visual.Muzzle; var aim=(locked+Vector3.up*.35f-origin).normalized;
            visual.Trigger(attack==4 ? "Special" : attack==2 ? "Slam" : "Attack");
            switch (attack)
            {
                case 0:
                    int count=Phase==1 ? 5 : 7;
                    for(int i=0;i<count;i++) World.Shoot(origin,Quaternion.Euler(0,0,(i-(count-1)*.5f)*10)*aim*(Phase==1 ? 3.2f : 3.8f),false,1,Family);
                    SetState("attack",.4f); break;
                case 1: velocity=new Vector3(direction*(Phase==1 ? 6.2f : 7.2f),0,0); SetState("attack",1.2f); break;
                case 2: velocity=new Vector3(direction*2,7,0); airborne=true; airTime=0; SetState("attack",1); break;
                case 3:
                    for(int k=-2;k<=2;k++) World.Shoot(new Vector3(RainX(k),4.6f,0),Vector3.down*3.8f,false,1,Family);
                    SetState("attack",.8f); break;
                case 4: velocity=Vector3.zero; shotTimer=0; SetState("attack",1.6f); break;
                case 5:
                    velocity=new Vector3(Mathf.Clamp((locked.x-transform.position.x)*2,-6,6),-5,0);
                    airborne=true; airTime=0; SetState("attack",.9f); break;
            }
            World.App.Audio.Play("shoot",.65f,.8f);
        }
        void Slam()
        {
            if(World.Camera) World.Camera.Shake(.14f); World.App.Audio.Play("explode",.6f);
            for(int d=-1;d<=1;d+=2) World.Shoot(transform.position+new Vector3(d*.95f,.15f,0),Vector3.right*d*4.5f,false,1,Family);
        }
        public void Hit(int amount)
        {
            if (!Active || Defeated || State=="intro" || State=="transform" || amount<=0) return;
            Health=Mathf.Max(0,Health-amount); visual.Flash();
            if (IsFinal && Phase<3)
            {
                int threshold=MaxHealth*(3-Phase)/3;
                if (Health<=threshold)
                {
                    Health=Mathf.Max(Health,threshold); Phase++; attackNumber=0; airborne=false; velocity=Vector3.zero;
                    World.ClearProjectiles(); SetVisual(); SetState("transform",2.1f); visual.Trigger("Transform");
                    World.Player.Protect(2.4f); World.Banner=DisplayName; World.App.Audio.Play("alarm"); return;
                }
            }
            else if (!IsFinal && Phase==1 && Health<=MaxHealth/2) { Phase=2; World.Banner=DisplayName+" / ENRAGED"; }
            if (Health>0) return;
            Defeated=true; Active=false; body.enabled=false;
            if(warnings) Destroy(warnings);
            visual.SetAnimationSpeed(1); visual.Trigger("Death"); World.BossDied(); Destroy(gameObject,1.5f);
        }
        public void Slow(float seconds) { if(Active && !Defeated) slowUntil=Mathf.Max(slowUntil,Time.time+Mathf.Min(seconds,1.2f)); }
        void OnDestroy() { if(warnings) Destroy(warnings); }
    }
}
