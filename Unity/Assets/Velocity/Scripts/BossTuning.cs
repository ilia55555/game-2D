using System.Collections.Generic;
using UnityEngine;
namespace Velocity
{
    /// <summary>Progression is shared by the actor, terrain director and tests.</summary>
    public struct BossTuning
    {
        public float Warning, Recovery, Idle, BulletSpeed, ChargeSpeed, BarrageInterval;
        public int FanCount, RainCount, DangerPanels;
        public const int FinalHealth = 360;
        public static BossTuning For(int stage, bool final, int phase, bool assist)
        {
            stage=Mathf.Clamp(stage,0,5); phase=Mathf.Clamp(phase,1,final?3:2);
            var t=new BossTuning {
                Warning=final ? 1.18f-phase*.08f : 1.6f-stage*.065f-(phase-1)*.1f,
                Recovery=final ? .82f-phase*.09f : 1.65f-stage*.12f-(phase-1)*.12f,
                Idle=final ? .45f-phase*.08f : .95f-stage*.085f-(phase-1)*.1f,
                BulletSpeed=final ? 4.1f+phase*.3f : 2.7f+stage*.24f+(phase-1)*.25f,
                ChargeSpeed=final ? 7.1f+phase*.35f : 4.8f+stage*.4f+(phase-1)*.3f,
                BarrageInterval=final ? .3f-phase*.03f : .48f-stage*.035f,
                FanCount=final ? 5+phase*2 : 3+stage/2*2+(phase-1)*2,
                RainCount=final ? 4+phase : 3+stage/2,
                DangerPanels=final ? Mathf.Min(4,phase+1) : 1+stage/2
            };
            if(assist) { t.Warning*=1.3f; t.Recovery*=1.2f; t.BulletSpeed*=.8f; t.ChargeSpeed*=.85f; t.DangerPanels=Mathf.Max(1,t.DangerPanels-1); }
            return t;
        }
    }
    public static class ArenaPattern
    {
        // Every unsafe panel has a safe neighbour. Entrance/exit and the boss's
        // current/predicted landing positions are never removed.
        public static int[] Select(int tiles, int count, int seed, int occupied, int landing)
        {
            var result=new List<int>();
            for(int n=0;n<tiles-2 && result.Count<count;n++)
            {
                int i=1+((seed+n)%(tiles-2)+(tiles-2))%(tiles-2);
                if(Mathf.Abs(i-occupied)<=1 || Mathf.Abs(i-landing)<=1) continue;
                bool adjacent=false;
                foreach(int other in result) if(Mathf.Abs(i-other)<=1) { adjacent=true; break; }
                if(!adjacent) result.Add(i);
            }
            return result.ToArray();
        }
    }
}
