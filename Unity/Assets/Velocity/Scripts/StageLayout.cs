using System;
using System.Linq;
using UnityEngine;
namespace Velocity
{
    /// <summary>Optional prefab-based route override; no runtime objects are needed to read it.</summary>
    public class StageLayout : MonoBehaviour
    {
        public int StageIndex;
        public float Length=104, ArenaStart=84;
        public Vector3 Spawn=new Vector3(1.7f,.02f,0), BossSpawn=new Vector3(97.5f,0,0);
        public StageData Export(StageData source)
        {
            if(StageIndex!=source.index || Length<=ArenaStart+5 || ArenaStart<=0)
                throw new InvalidOperationException("Invalid AERO layout index or arena bounds: "+name);
            if(transform.localScale!=Vector3.one || Quaternion.Angle(transform.localRotation,Quaternion.identity)>.01f)
                throw new InvalidOperationException("AERO layout roots require scale 1 and rotation 0: "+name);
            var result=JsonUtility.FromJson<StageData>(JsonUtility.ToJson(source));
            result.length=Length*100; result.arena=ArenaStart*100;
            result.spawn=new Vector3(Spawn.x,Spawn.y,0); result.bossSpawn=new Vector3(BossSpawn.x,BossSpawn.y,0); result.customBossSpawn=true;
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
            result.enemies=markers.Where(m=>m.Kind==MarkerKind.Enemy).Select(m=> { var p=Position(m); return new EnemySpec{x=p.x*100,y=620-p.y*100,kind=m.EnemyKind}; }).ToArray();
            if(result.floors.Length==0 || result.checkpoints.Length!=3 || result.relics.Length!=3)
                throw new InvalidOperationException("AERO layouts need a floor, three checkpoints and three relics.");
            foreach(var checkpoint in result.checkpoints)
            {
                var p=checkpoint.values;
                if(!Array.Exists(result.floors,r=>r.values[0]<=p[0] && p[0]+70<r.values[0]+r.values[2] && Mathf.Abs(p[1]-r.values[1])<1))
                    throw new InvalidOperationException("Place each checkpoint on a floor with at least 0.7m of safe space to its right.");
            }
            if(!Array.Exists(result.floors,r=>r.values[0]<=result.arena && r.values[0]+r.values[2]>=result.length && Mathf.Abs(r.values[1]-620)<1))
                throw new InvalidOperationException("The boss arena needs a continuous floor at Y=0 through the exit.");
            return result;
        }
    }
}
