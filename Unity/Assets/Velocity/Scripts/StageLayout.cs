using System;
using System.Linq;
using UnityEngine;
namespace Velocity
{
    /// <summary>Optional prefab-based route override; no runtime objects are needed to read it.</summary>
    public class StageLayout : MonoBehaviour
    {
        public int StageIndex;
        public float Length=418, ArenaStart=394;
        public Vector3 Spawn=new Vector3(1.7f,.02f,0), BossSpawn=new Vector3(411.5f,0,0);
        public bool ReactiveArena=true;
        public float KillY=-13, CameraMinY=-5.6f, CameraMaxY=13.5f;
        public SectionSpec[] Sections;
        public TerritorySpec[] Territories;
        void OnDrawGizmosSelected()
        {
            var matrix=Gizmos.matrix; Gizmos.matrix=transform.localToWorldMatrix;
            Gizmos.color=Color.red; Gizmos.DrawLine(new Vector3(0,KillY,0),new Vector3(Length,KillY,0));
            foreach(var zone in Territories ?? Array.Empty<TerritorySpec>())
                Gizmos.DrawWireCube(new Vector3((zone.start+zone.end)/2,zone.y+1,0),new Vector3(zone.end-zone.start,2,2.2f));
            foreach(var section in Sections ?? Array.Empty<SectionSpec>())
            {
                Gizmos.color=section.pressure==0?Color.green:section.pressure==3?Color.red:Color.yellow;
                Gizmos.DrawLine(new Vector3(section.start,section.y-.6f,0),new Vector3(section.end,section.y-.6f,0));
            }
            Gizmos.color=Color.cyan;
            Gizmos.DrawWireCube(new Vector3((ArenaStart+Length)/2,1,0),new Vector3(Length-ArenaStart,2,2.2f));
            Gizmos.matrix=matrix;
        }
        public StageData Export(StageData source)
        {
            if(StageIndex!=source.index || Length<=ArenaStart+5 || ArenaStart<=0)
                throw new InvalidOperationException("Invalid AERO layout index or arena bounds: "+name);
            if(transform.localScale!=Vector3.one || Quaternion.Angle(transform.localRotation,Quaternion.identity)>.01f)
                throw new InvalidOperationException("AERO layout roots require scale 1 and rotation 0: "+name);
            var result=JsonUtility.FromJson<StageData>(JsonUtility.ToJson(source));
            result.length=Length*100; result.arena=ArenaStart*100;
            result.spawn=new Vector3(Spawn.x,Spawn.y,0); result.bossSpawn=new Vector3(BossSpawn.x,BossSpawn.y,0); result.customBossSpawn=true;
            result.reactiveArena=ReactiveArena; result.killY=KillY; result.cameraMinY=CameraMinY; result.cameraMaxY=CameraMaxY;
            result.sections=Sections ?? Array.Empty<SectionSpec>(); result.territories=Territories ?? Array.Empty<TerritorySpec>();
            // The JSON route proof describes the shipped geometry, not a user's edits.
            result.route=null;
            var markers=GetComponentsInChildren<LevelMarker>(true).Where(m=>m.gameObject.activeSelf).ToArray();
            Vector3 Position(LevelMarker m) => transform.InverseTransformPoint(m.transform.position);
            Row[] Rows(MarkerKind kind) => markers.Where(m=>m.Kind==kind).OrderBy(m=>Position(m).x).Select(m=>
            {
                var p=Position(m); float x=p.x*100,y=620-p.y*100;
                return new Row {values=kind switch {
                    MarkerKind.Floor or MarkerKind.Platform or MarkerKind.Crumble or MarkerKind.Spike => new[]{x,y,m.Width*100},
                    MarkerKind.Moving => new[]{x,y,m.Width*100,m.Amplitude.x*100,-m.Amplitude.y*100,m.Period},
                    MarkerKind.Laser => new[]{x,y,m.Height*100,m.Phase}, _ => new[]{x,y} }};
            }).ToArray();
            result.floors=Rows(MarkerKind.Floor); result.platforms=Rows(MarkerKind.Platform); result.moving=Rows(MarkerKind.Moving);
            result.crumble=Rows(MarkerKind.Crumble); result.spikes=Rows(MarkerKind.Spike); result.lasers=Rows(MarkerKind.Laser);
            result.springs=Rows(MarkerKind.Spring); result.checkpoints=Rows(MarkerKind.Checkpoint); result.gems=Rows(MarkerKind.Coin); result.relics=Rows(MarkerKind.Relic);
            result.enemies=markers.Where(m=>m.Kind==MarkerKind.Enemy).Select(m=> { var p=Position(m); return new EnemySpec{x=p.x*100,y=620-p.y*100,kind=m.EnemyKind,territory=m.TerritoryId,pressure=m.Pressure}; }).ToArray();
            if(result.floors.Length==0 || result.checkpoints.Length<3 || result.relics.Length!=3)
                throw new InvalidOperationException("AERO layouts need a floor, at least three checkpoints and exactly three relics.");
            float lowest=result.floors.Concat(result.platforms).Concat(result.moving).Concat(result.crumble).Min(r=>(620-r.values[1])/100);
            if(KillY>lowest-2 || CameraMinY>lowest+2 || CameraMinY>=CameraMaxY)
                throw new InvalidOperationException("KillY must sit at least 2m below the lowest surface, and camera limits must include the valley.");
            if(ReactiveArena && Length-ArenaStart<18)
                throw new InvalidOperationException("Reactive arenas require at least 18m for twelve panels and three escape ledges.");
            if(BossSpawn.x<ArenaStart+1 || BossSpawn.x>Length-1.6f || BossSpawn.y<0)
                throw new InvalidOperationException("BossSpawn must be inside the arena, at or above Y=0.");
            foreach(var checkpoint in result.checkpoints)
            {
                var p=checkpoint.values;
                if(!Array.Exists(result.floors,r=>r.values[0]<=p[0] && p[0]+70<r.values[0]+r.values[2] && Mathf.Abs(p[1]-r.values[1])<1))
                    throw new InvalidOperationException("Place each checkpoint on a floor with at least 0.7m of safe space to its right.");
            }
            if(!Array.Exists(result.floors,r=>r.values[0]<=result.arena+1 && r.values[0]+r.values[2]>=result.length-1 && Mathf.Abs(r.values[1]-620)<1))
                throw new InvalidOperationException("The boss arena needs a continuous floor at Y=0 through the exit.");
            if(result.territories.Select(t=>t.id).Distinct().Count()!=result.territories.Length)
                throw new InvalidOperationException("Enemy territory IDs must be unique.");
            foreach(var territory in result.territories)
            {
                if(territory.id<0 || territory.start<0 || territory.end>ArenaStart || territory.end-territory.start<10 ||
                    !result.floors.Any(r=>r.values[0]/100<=territory.start && (r.values[0]+r.values[2])/100>=territory.end && Mathf.Abs((620-r.values[1])/100-territory.y)<.01f))
                    throw new InvalidOperationException("Each enemy territory needs a level floor, at least 10m wide, before the arena.");
                var guards=result.enemies.Where(e=>e.territory==territory.id).ToArray();
                if(guards.Length==0 || guards.Any(e=>e.x/100<territory.start || e.x/100>territory.end))
                    throw new InvalidOperationException("Assign living enemy markers to each territory ID, inside its bounds.");
            }
            if(result.enemies.Any(e=>e.territory>=0 && !result.territories.Any(t=>t.id==e.territory)))
                throw new InvalidOperationException("An enemy refers to a missing territory ID.");
            if(result.sections.Any(s=>s.start<0 || s.end<=s.start || s.end>ArenaStart+.01f))
                throw new InvalidOperationException("Section bounds must be ordered and inside the route before the arena.");
            return result;
        }
    }
}
