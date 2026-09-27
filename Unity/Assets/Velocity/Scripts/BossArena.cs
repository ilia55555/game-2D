using UnityEngine;
namespace Velocity
{
    /// <summary>Terrain follows the boss telegraph -> attack -> impact lifecycle.</summary>
    public class BossArena : MonoBehaviour
    {
        public const int TileCount = 12;
        public WorldSession World { get; private set; }
        public bool Warning { get; private set; }
        public bool HazardActive { get; private set; }
        public int MissingPanels { get; private set; }
        public int[] PlannedPanels { get; private set; } = new int[0];
        GameObject[] tiles, marks;
        PlatformMotion[] ledges;
        float left, width, timer;
        bool collapse, waitForImpact;
        int phase;
        public void Initialize(WorldSession world)
        {
            World=world; left=world.Data.arena/100; width=(world.Data.length-world.Data.arena)/100/TileCount;
            tiles=new GameObject[TileCount]; marks=new GameObject[TileCount]; ledges=new PlatformMotion[3];
            for(int i=0;i<TileCount;i++)
            {
                tiles[i]=world.CreateTerrain(new[]{(left+i*width)*100,620,width*100},.7f,false,false,false,"terrain_arena");
                tiles[i].name="Arena panel "+i;
                marks[i]=Geometry.Box("Panel warning "+i,transform,new Vector3(left+(i+.5f)*width,.035f,0),new Vector3(width-.12f,.055f,1.9f),Color.yellow);
                marks[i].SetActive(false);
            }
            for(int i=0;i<3;i++)
            {
                float x=Mathf.Lerp(left+3.5f,world.Data.length/100-3.5f,i/2f);
                var ledge=world.CreateTerrain(new[]{(x-1.5f)*100,505,300},.3f,true,false,false,"terrain_arena");
                ledge.name="Boss escape ledge "+i; ledges[i]=ledge.GetComponent<PlatformMotion>(); ledges[i].PlayerOnly=true;
            }
        }
        int TileAt(float x) => Mathf.Clamp(Mathf.FloorToInt((x-left)/width),0,TileCount-1);
        public float PanelCenter(int tile) => left+(tile+.5f)*width;
        public void Prepare(int attack, int bossPhase, bool final, int sequence, Vector3 target, Vector3 boss, Vector3 landing)
        {
            ResetArena(); phase=bossPhase;
            var tuning=BossTuning.For(World.Index,final,phase,World.App.Save.Data.assist);
            PlannedPanels=ArenaPattern.Select(TileCount,tuning.DangerPanels,TileAt(target.x)+sequence,TileAt(boss.x),TileAt(landing.x));
            bool heavy=attack==2 || attack==5;
            collapse=attack!=1 && ((heavy && (World.Index>0 || phase>1 || final)) || (attack==3 && phase>1));
            waitForImpact=heavy; Warning=true;
            foreach(int i in PlannedPanels)
            {
                marks[i].GetComponent<Renderer>().sharedMaterial=Geometry.Material(Color.yellow);
                marks[i].transform.localScale=new Vector3(width-.12f,.055f,1.9f);
                marks[i].transform.position=new Vector3(PanelCenter(i),.035f,0); marks[i].SetActive(true);
            }
            for(int i=0;i<ledges.Length;i++)
                ledges[i].OffsetTarget=Vector3.up*(final ? .25f+((i+phase)%3)*.45f : (i==sequence%3?.65f:0));
        }
        public void Execute()
        {
            if(!Warning) return;
            if(!waitForImpact) ActivateGround();
        }
        public void Impact()
        {
            if(Warning && waitForImpact) ActivateGround();
        }
        void ActivateGround()
        {
            Warning=false; HazardActive=true; timer=1.6f+(phase-1)*.15f;
            foreach(int i in PlannedPanels)
            {
                // A moving boss might have been slowed or blocked after predicting its
                // landing. Recheck live position before removing physical support.
                if(collapse && World.Boss && Mathf.Abs(World.Boss.transform.position.x-PanelCenter(i))<width*1.5f)
                { marks[i].SetActive(false); continue; }
                marks[i].GetComponent<Renderer>().sharedMaterial=Geometry.Material(collapse ? new Color(1,.35f,.08f) : new Color(1,.1f,.12f));
                if(collapse) { tiles[i].SetActive(false); MissingPanels++; }
                else
                {
                    marks[i].transform.localScale=new Vector3(width-.12f,.24f,1.9f);
                    marks[i].transform.position=new Vector3(PanelCenter(i),.12f,0);
                }
            }
        }
        void Update()
        {
            if(!World || !World.Running || !World.Player || World.Player.Dead) return;
            if(MissingPanels>0 && World.Player.transform.position.y<-.6f) Rescue(true);
            if(!HazardActive) return;
            var p=World.Player.transform.position;
            if(!collapse && p.x>=left && p.x<=World.Data.length/100 && p.y<.32f && p.y>-.2f)
            {
                int tile=TileAt(p.x);
                if(marks[tile].activeSelf) World.Player.Damage(1,new Vector3(PanelCenter(tile),0,0));
            }
            timer-=Time.deltaTime;
            if(timer<=0) ResetArena();
        }
        void Rescue(bool damage)
        {
            var player=World.Player;
            if(!player || player.Dead || player.transform.position.x<left || player.transform.position.x>World.Data.length/100) return;
            int best=0; float distance=float.MaxValue;
            for(int i=0;i<TileCount;i++) if(tiles[i].activeSelf)
            {
                float d=Mathf.Abs(PanelCenter(i)-player.transform.position.x);
                if(World.Boss && Mathf.Abs(PanelCenter(i)-World.Boss.transform.position.x)<2) d+=8;
                if(d<distance) { best=i; distance=d; }
            }
            if(damage) player.Damage(1,player.transform.position+Vector3.down);
            if(player.Dead) return;
            player.Teleport(new Vector3(PanelCenter(best),.06f,0)); player.Protect(1.4f);
        }
        public void ResetArena()
        {
            if(tiles==null) return;
            if(MissingPanels>0 && World.Player && World.Player.transform.position.y<0) Rescue(false);
            foreach(var tile in tiles) tile.SetActive(true);
            foreach(var mark in marks) mark.SetActive(false);
            foreach(var ledge in ledges) if(ledge) ledge.OffsetTarget=Vector3.zero;
            MissingPanels=0; Warning=false; HazardActive=false; timer=0; PlannedPanels=new int[0];
        }
    }
}
