using System.Collections.Generic;
using UnityEngine;
namespace Velocity
{
    public class EnemyTerritory : MonoBehaviour
    {
        public WorldSession World;
        public TerritorySpec Data;
        public bool Cleared { get; private set; }
        public bool Warning { get; private set; }
        public bool HazardActive { get; private set; }
        public readonly List<EnemyActor> Operators = new();
        readonly List<PlatformMotion> lifts = new();
        GameObject strip;
        float timer=2, lockedX, clock;
        public void Initialize(WorldSession world,TerritorySpec data)
        {
            World=world; Data=data;
            strip=Geometry.Box("Enemy ground warning",transform,Vector3.zero,new Vector3(2.2f,.06f,1.8f),Color.yellow);
            strip.SetActive(false);
            for(int i=0;i<3;i++)
            {
                float x=Mathf.Lerp(data.start+3,data.end-3,i/2f);
                var go=world.CreateTerrain(new[]{(x-1.3f)*100,620-(data.y+1.25f)*100,260},.3f,true,false,false,"terrain_moving");
                go.name="Occupied lift "+data.id+" / "+i; lifts.Add(go.GetComponent<PlatformMotion>());
            }
        }
        public void ResetCycle()
        {
            Warning=false; HazardActive=false; timer=2; if(strip) strip.SetActive(false);
            foreach(var lift in lifts) lift.OffsetTarget=Vector3.zero;
        }
        void Update()
        {
            if(Cleared || !World.Running) return;
            bool alive=false;
            foreach(var guard in Operators) if(guard && guard.Health>0) { alive=true; break; }
            if(!alive)
            {
                Cleared=true; ResetCycle(); World.Score+=750;
                World.Banner="OUTPOST LIBERATED / traps disabled";
                World.AddPickup(new Vector3((Data.start+Data.end)/2,Data.y+.45f,0),"heal"); return;
            }
            var player=World.Player;
            if(!player || player.Dead || player.transform.position.x<Data.start || player.transform.position.x>Data.end)
            { ResetCycle(); return; }
            clock+=Time.deltaTime;
            for(int i=0;i<lifts.Count;i++) lifts[i].OffsetTarget=Vector3.up*(.4f+.4f*Mathf.Sin(clock*1.4f+i*2));
            timer-=Time.deltaTime;
            if(timer<=0)
            {
                if(Warning)
                {
                    Warning=false; HazardActive=true; timer=1.05f;
                    strip.GetComponent<Renderer>().sharedMaterial=Geometry.Material(new Color(1,.15f,.1f));
                    strip.transform.localScale=new Vector3(2.2f,.28f,1.8f);
                    strip.transform.position=new Vector3(lockedX,Data.y+.14f,0);
                }
                else if(HazardActive) { HazardActive=false; strip.SetActive(false); timer=Data.pressure==3?2.2f:3.2f; }
                else
                {
                    Warning=true; timer=World.App.Save.Data.assist?1.6f:1.25f;
                    lockedX=Mathf.Clamp(player.transform.position.x,Data.start+1.2f,Data.end-1.2f);
                    strip.transform.position=new Vector3(lockedX,Data.y+.035f,0); strip.transform.localScale=new Vector3(2.2f,.06f,1.8f);
                    strip.GetComponent<Renderer>().sharedMaterial=Geometry.Material(Color.yellow); strip.SetActive(true);
                }
            }
            if(HazardActive && Mathf.Abs(player.transform.position.x-lockedX)<1.2f && player.transform.position.y<Data.y+.35f && player.transform.position.y>Data.y-.2f)
                player.Damage(1,new Vector3(lockedX,Data.y,0));
        }
    }
}
