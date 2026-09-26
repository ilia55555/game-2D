using UnityEngine;
namespace Velocity
{
    public class WorldItem : MonoBehaviour
    {
        public WorldSession World;
        public string Kind;
        public float Width = 1, Height = 1.8f, Phase;
        public int Index;
        float clock, cooldown;
        bool active, taken;
        Transform art;
        Vector3 initial;
        Vector3 visualOffset;
        public void Initialize()
        {
            initial = transform.position;
            Color color = Kind == "relic" ? new Color(1,.8f,.3f) : World.Data.Accent;
            switch (Kind)
            {
                case "gem": case "relic": case "heal":
                    art = Geometry.Primitive(Kind, PrimitiveType.Sphere, transform, Vector3.zero, Vector3.one * (Kind == "gem" ? .18f : .32f), color).transform; break;
                case "spike":
                    art = new GameObject("Spike bed").transform; art.SetParent(transform,false);
                    for (float x = .1f; x < Width; x += .2f)
                    {
                        var tooth = Geometry.Box("Tooth",art,new Vector3(x,.08f,0),new Vector3(.16f,.16f,.5f),Color.gray);
                        tooth.transform.localRotation = Quaternion.Euler(0,0,45);
                    } break;
                case "laser": art = Geometry.Box("Laser",transform,new Vector3(0,Height/2,0),new Vector3(.06f,Height,.06f),Color.yellow).transform; break;
                case "spring": art = Geometry.Box("Spring",transform,new Vector3(0,.08f,0),new Vector3(.58f,.16f,.6f),Color.yellow).transform; break;
                case "checkpoint": art = Geometry.Primitive("Checkpoint",PrimitiveType.Cylinder,transform,new Vector3(0,.5f,.6f),new Vector3(.3f,.5f,.3f),color).transform; break;
                case "portal":
                    art = new GameObject("Gate").transform; art.SetParent(transform,false);
                    Geometry.Box("Left",art,new Vector3(-.6f,1,0),new Vector3(.2f,2,.5f),color);
                    Geometry.Box("Right",art,new Vector3(.6f,1,0),new Vector3(.2f,2,.5f),color);
                    Geometry.Box("Top",art,new Vector3(0,2,0),new Vector3(1.4f,.2f,.5f),color); break;
            }
            var slot=World.Models ? World.Models.Find("item_"+Kind) : null;
            if(slot!=null && slot.prefab && Kind!="laser")
            {
                if(art) art.gameObject.SetActive(false);
                var visual=Instantiate(slot.prefab,transform);
                visual.transform.localPosition=slot.position; visual.transform.localEulerAngles=slot.rotation; visual.transform.localScale=slot.scale;
                ModelCatalog.MakeVisualOnly(visual); art=visual.transform;
            }
            if(art) visualOffset=art.localPosition;
        }
        void Update()
        {
            if (!World.Running || taken || !World.Player || World.Player.Dead) return;
            clock += Time.deltaTime; cooldown -= Time.deltaTime;
            var p = World.Player; var d = p.transform.position - initial;
            switch (Kind)
            {
                case "gem": case "relic": case "heal":
                    art.localPosition = visualOffset + Vector3.up * Mathf.Sin(clock*3) * .05f; art.Rotate(0,90*Time.deltaTime,0);
                    if (Vector3.Distance(p.transform.position + Vector3.up * .32f, initial) < .48f) Collect(); break;
                case "spike": if (d.x > -.15f && d.x < Width+.15f && d.y > -.15f && d.y < .22f) p.Damage(1,initial+Vector3.right*Width/2); break;
                case "laser":
                    float cycle = Mathf.Repeat(clock+Phase,3.6f); bool on = cycle > 1.4f && cycle < 2.6f;
                    art.gameObject.SetActive(cycle > .7f);
                    art.GetComponent<Renderer>().sharedMaterial = Geometry.Material(on ? Color.red : Color.yellow);
                    if (on && Mathf.Abs(d.x) < .26f && d.y > -.05f && d.y < Height+.1f) p.Damage(1,initial); break;
                case "spring": if (Mathf.Abs(d.x)<.3f && Mathf.Abs(d.y)<.18f && p.Velocity.y<=0 && cooldown<=0) { p.Spring(); cooldown=.35f; } break;
                case "checkpoint":
                    if (!active && Mathf.Abs(d.x)<.4f && Mathf.Abs(d.y)<.9f)
                    {
                        if(Index<World.CheckpointId) break;
                        active=true; World.Checkpoint = initial + new Vector3(.55f,.02f,0); World.CheckpointId=Index;
                        p.Health=p.MaxHealth; p.Energy=100; World.Banner="CHECKPOINT - health and energy restored"; World.App.Audio.Play("checkpoint");
                    } break;
                case "portal": if (World.BossDefeated && Mathf.Abs(d.x)<.48f && Mathf.Abs(d.y)<1.2f) World.Finish(); break;
            }
        }
        void Collect()
        {
            taken=true;
            switch (Kind)
            {
                case "gem": World.Gems++; World.Score+=100; World.App.Audio.Play("gem",1+(World.Gems%7)*.06f,.5f); break;
                case "relic": World.Relics++; World.Score+=1500; World.Banner=$"CORE SHARD {World.Relics} / 3"; World.App.Audio.Play("checkpoint"); break;
                case "heal": World.Player.Health=Mathf.Min(World.Player.MaxHealth,World.Player.Health+3); World.App.Audio.Play("heal"); break;
            }
            Destroy(gameObject);
        }
    }
}
