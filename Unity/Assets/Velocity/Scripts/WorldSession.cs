using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace Velocity
{
    [DefaultExecutionOrder(-10)]
    public class WorldSession : MonoBehaviour
    {
        public GameApp App;
        public StageData Data;
        public ModelCatalog Models => App.Models;
        public int Index => Data.index;
        public PlayerMotor Player;
        public BossActor Boss;
        public SideCamera Camera;
        public int Score, Gems, Relics, Kills, Deaths, CheckpointId = -1;
        public float Elapsed;
        public Vector3 Checkpoint = new Vector3(1.7f,.02f,0);
        public bool BossStarted, BossDefeated, Completed, Respawning;
        public bool FinalEncounter { get; private set; }
        public bool BossTransition { get; private set; }
        Coroutine bossArrival;
        public bool Running => App && App.Playing && !App.Paused && !Completed;
        public string Banner;
        public readonly List<CharacterController> Characters = new();
        GameObject gate;
        Transform projectiles;
        public void Initialize(GameApp app, StageData data)
        {
            App=app;
            var layoutSlot=app.Models ? app.Models.Find("layout_"+data.index) : null;
            var layout=layoutSlot!=null && layoutSlot.prefab ? layoutSlot.prefab.GetComponent<StageLayout>() : null;
            Data=layout ? layout.Export(data) : data; data=Data; Banner=data.title; Checkpoint=data.spawn;
            projectiles=new GameObject("Projectiles").transform; projectiles.SetParent(transform,false);
            foreach (var r in data.floors) Terrain(r.values, (1000-r.values[1])/100f, false, false);
            foreach (var r in data.platforms) Terrain(r.values,.42f,true,false);
            foreach (var r in data.moving) Terrain(r.values,.4f,true,false,true);
            foreach (var r in data.crumble) Terrain(r.values,.38f,true,true);
            foreach (var r in data.gems) AddPickup(CampaignData.Point(r.values[0],r.values[1]),"gem");
            foreach (var r in data.relics) AddPickup(CampaignData.Point(r.values[0],r.values[1]),"relic");
            foreach (var r in data.spikes) Item("spike",r.values);
            foreach (var r in data.lasers) Item("laser",r.values);
            foreach (var r in data.springs) Item("spring",r.values);
            for (int i=0;i<data.checkpoints.Length;i++) Item("checkpoint",data.checkpoints[i].values,i);
            Item("portal",new[]{data.length-130,620});
            BuildEnvironment(); SpawnPlayer(); SpawnBoss();
            foreach (var e in data.enemies)
            {
                var go=new GameObject(e.kind); go.transform.SetParent(transform,false); go.transform.position=CampaignData.Point(e.x,e.y);
                go.AddComponent<EnemyActor>().Initialize(this,e.kind); Characters.Add(go.GetComponent<CharacterController>());
            }
            var cameraObject=new GameObject("Side Camera"); cameraObject.transform.SetParent(transform,false);
            var c=cameraObject.AddComponent<Camera>(); c.orthographic=false; c.fieldOfView=38; c.nearClipPlane=.1f; c.farClipPlane=150;
            c.backgroundColor=SkyColor; c.clearFlags=CameraClearFlags.SolidColor;
            cameraObject.tag="MainCamera"; cameraObject.AddComponent<AudioListener>();
            Camera=cameraObject.AddComponent<SideCamera>(); Camera.World=this; Camera.Snap();
            App.Audio.Music(Data.music); Physics.SyncTransforms();
        }
        GameObject Terrain(float[] f,float height,bool oneWay,bool crumble,bool moving=false)
        {
            var p=CampaignData.Point(f[0],f[1]); float width=f[2]/100;
            var go=Geometry.Box("Terrain",transform,p+new Vector3(width/2,-height/2,0),new Vector3(width,height,2.2f),Data.Accent*.32f,true);
            // Decorative top surface shares the physical slab's transform.
            Geometry.Box("Surface",go.transform,new Vector3(0,.49f,0),new Vector3(1,.025f,1),Data.Accent*.72f);
            if (oneWay || crumble || moving)
            {
                var motion=go.AddComponent<PlatformMotion>(); motion.World=this; motion.OneWay=oneWay; motion.Crumble=crumble;
                if (moving) { motion.Amplitude=new Vector3(f[3]/100,-f[4]/100,0); motion.Period=f[5]; }
            }
            return go;
        }
        void Item(string kind,float[] values,int index=0)
        {
            var go=new GameObject(kind); go.transform.SetParent(transform,false); go.transform.position=CampaignData.Point(values[0],values[1]);
            var item=go.AddComponent<WorldItem>(); item.World=this; item.Kind=kind; item.Index=index;
            if (kind=="spike") item.Width=values[2]/100;
            if (kind=="laser") { item.Height=values[2]/100; item.Phase=values[3]; }
            item.Initialize();
        }
        public void AddPickup(Vector3 pos,string kind)
        {
            var go=new GameObject(kind); go.transform.SetParent(transform,false); go.transform.position=pos;
            var item=go.AddComponent<WorldItem>(); item.World=this; item.Kind=kind; item.Initialize();
        }
        void SpawnPlayer()
        {
            var go=new GameObject("Hero"); go.transform.SetParent(transform,false); go.transform.position=Checkpoint;
            Player=go.AddComponent<PlayerMotor>(); Player.Initialize(this); Characters.Add(go.GetComponent<CharacterController>());
        }
        void SpawnBoss()
        {
            var go=new GameObject(FinalEncounter ? Data.finalBossName : Data.bossName); go.transform.SetParent(transform,false);
            go.transform.position=Data.customBossSpawn ? Data.bossSpawn : CampaignData.Point(Data.length-650,620);
            Boss=go.AddComponent<BossActor>(); Boss.Initialize(this); Characters.Add(go.GetComponent<CharacterController>());
        }
        Color SkyColor => new[]{new Color(.12f,.32f,.43f),new Color(.62f,.42f,.24f),new Color(.26f,.41f,.59f),new Color(.12f,.26f,.42f),new Color(.19f,.04f,.06f),new Color(.10f,.055f,.19f)}[Index];
        void BuildEnvironment()
        {
            RenderSettings.ambientMode=UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor=Color.Lerp(Data.Accent,Color.white,.35f)*.7f; RenderSettings.ambientEquatorColor=Data.Accent*.35f; RenderSettings.ambientGroundColor=SkyColor*.35f;
            RenderSettings.fog=true; RenderSettings.fogColor=SkyColor; RenderSettings.fogMode=FogMode.ExponentialSquared; RenderSettings.fogDensity=.022f;
            var sun=new GameObject("Key Light"); sun.transform.SetParent(transform,false); sun.transform.rotation=Quaternion.Euler(35,-35,0);
            var light=sun.AddComponent<Light>(); light.type=LightType.Directional; light.color=new Color(1,.9f,.75f); light.intensity=1.2f; light.shadows=LightShadows.Soft;
            var random=new System.Random(617+Index);
            var environment=Models ? Models.Find("environment_"+Index) : null;
            if (environment!=null && environment.prefab)
            {
                var model=Instantiate(environment.prefab,transform); model.transform.localPosition=environment.position;
                model.transform.localEulerAngles=environment.rotation; model.transform.localScale=environment.scale;
                // User scenery is visual-only: authored terrain remains the collision source.
                ModelCatalog.MakeVisualOnly(model);
            }
            else
            {
                // Real meshes at multiple depths; perspective provides parallax without billboard sprites.
                for(float x=0;x<Data.length/100;x+=3.3f)
                {
                    float height=3+(float)random.NextDouble()*5;
                    if(Index==0)
                    {
                        Geometry.Primitive("Tree trunk",PrimitiveType.Cylinder,transform,new Vector3(x,height/2,4),new Vector3(.32f,height/2,.32f),new Color(.12f,.15f,.12f));
                        Geometry.Primitive("Tree canopy",PrimitiveType.Sphere,transform,new Vector3(x,height,4),new Vector3(3,2.8f,2.6f),Data.Accent*.23f);
                    }
                    else if(Index==2 || Index==3 || Index==4)
                    {
                        var rock=Geometry.Primitive(Index==4?"Volcanic rock":Index==3?"Ice shard":"Mountain",PrimitiveType.Cube,transform,
                            new Vector3(x,height/2,7),new Vector3(Index==2?4:1.5f,height,3),Data.Accent*.4f);
                        rock.transform.Rotate(0,0,Index==2?30:18);
                        if(Index==4) Geometry.Box("Lava glow",transform,new Vector3(x,-1.8f,2),new Vector3(3.4f,.15f,4),new Color(1,.18f,.015f));
                    }
                    else
                    {
                        Geometry.Box(Index==1?"Sandstone tower":"Factory",transform,new Vector3(x,height/2,5),new Vector3(1.2f,height,1.4f),Data.Accent*.38f);
                        Geometry.Box("Inset",transform,new Vector3(x,height*.7f,4.25f),new Vector3(.08f,height*.5f,.06f),Data.Accent);
                    }
                    Geometry.Box("Far silhouette",transform,new Vector3(x*1.2f,height/2,15),new Vector3(3,height+5,3),Data.Accent*.1f);
                }
            }
        }
        void Update()
        {
            if(!Running || !Player || Player.Dead) return;
            Physics.SyncTransforms(); // PlatformMotion has moved before actors perform collision queries.
            Elapsed+=Time.deltaTime;
            if(!BossStarted && !BossDefeated && Player.transform.position.x>Data.arena/100+1.2f) StartBoss();
        }
        public void StartBoss()
        {
            if(BossStarted || BossDefeated) return;
            BossStarted=true; gate=Geometry.Box("Arena barrier",transform,new Vector3(Data.arena/100,3,0),new Vector3(.2f,10,2.2f),Data.Accent,true);
            if(Player.transform.position.x<Data.arena/100+1) Player.Teleport(new Vector3(Data.arena/100+2,.02f,0));
            Player.Health=Player.MaxHealth; Player.Energy=100; Boss.Activate();
        }
        public void PlayerDied()
        {
            if(Respawning || Completed) return; Deaths++; Respawning=true; Banner="SIGNAL LOST - returning to checkpoint";
            if(bossArrival!=null) { StopCoroutine(bossArrival); bossArrival=null; BossTransition=false; }
            App.Audio.Play("explode",.8f); StartCoroutine(Respawn());
        }
        IEnumerator Respawn()
        {
            yield return new WaitForSeconds(1.1f);
            ClearProjectiles();
            if(BossStarted && !BossDefeated)
            {
                if(Boss) { Boss.gameObject.SetActive(false); Destroy(Boss.gameObject); }
                if(gate) { gate.SetActive(false); Destroy(gate); } BossStarted=false; SpawnBoss();
            }
            if(Player) { Player.gameObject.SetActive(false); Destroy(Player.gameObject); }
            Characters.RemoveAll(c=>!c || !c.enabled || !c.gameObject.activeInHierarchy);
            SpawnPlayer(); Player.Protect(2); Camera.Snap(); Respawning=false; App.Audio.Music(Data.music);
        }
        public void BossDied()
        {
            if(BossDefeated || BossTransition) return;
            if(!FinalEncounter && !string.IsNullOrEmpty(Data.finalBossArt))
            {
                Score+=5000; ClearProjectiles(); FinalEncounter=true; BossTransition=true;
                Checkpoint=new Vector3(Data.arena/100+2,.02f,0); CheckpointId=3;
                Player.Protect(4); Player.Health=Player.MaxHealth; Player.Energy=100;
                Banner="IRONHORN DEFEATED / VEXAR APPROACHES";
                bossArrival=StartCoroutine(ArriveFinalBoss()); return;
            }
            BossDefeated=true; Score+=5000; ClearProjectiles();
            if(gate) { gate.SetActive(false); Destroy(gate); }
            Player.Protect(4); Banner="GUARDIAN DEFEATED - enter the gate";
            App.Audio.Music(Data.music); App.Audio.Play("win");
        }
        IEnumerator ArriveFinalBoss()
        {
            yield return new WaitForSeconds(1.8f);
            Characters.RemoveAll(c=>!c || !c.enabled);
            SpawnBoss(); Boss.Activate(); BossTransition=false; bossArrival=null;
        }
        public void Finish()
        {
            if(Completed || !BossDefeated) return; Completed=true;
            Score+=Mathf.Max(0,3000-(int)(Elapsed*5));
            App.Save.Complete(Index,Score,Elapsed,Gems,Relics); App.StageFinished();
        }
        public void Shoot(Vector3 pos,Vector3 velocity,bool friendly,int damage,string family)
        {
            if(projectiles.childCount>=200) return;
            var go=new GameObject(family); go.transform.SetParent(projectiles,false); go.transform.position=new Vector3(pos.x,pos.y,0);
            var shot=go.AddComponent<Projectile>(); shot.World=this; shot.Velocity=velocity; shot.Friendly=friendly; shot.Damage=damage; shot.Family=family; shot.Initialize();
        }
        public void ClearProjectiles() { foreach(Transform t in projectiles) { t.gameObject.SetActive(false); Destroy(t.gameObject); } }
        public void Effect(Vector3 pos,Color color,float size)
        {
            var go=Geometry.Primitive("Impact",PrimitiveType.Sphere,transform,pos,Vector3.one*size,color); Destroy(go,.12f);
        }
    }
}
