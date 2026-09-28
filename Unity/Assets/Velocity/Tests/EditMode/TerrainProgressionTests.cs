using System.Linq;
using NUnit.Framework;
namespace Velocity.Tests
{
    public class TerrainProgressionTests
    {
        [Test] public void LongRoutesHaveMandatoryVerticalTravelAndQuietCheckpoints()
        {
            foreach(var stage in CampaignData.Load().stages)
            {
                var heights=stage.route.Select(r=>(620-r.values[1])/100).ToArray();
                Assert.GreaterOrEqual(heights.Max()-heights.Min(),15);
                Assert.LessOrEqual(stage.killY,heights.Min()-5);
                Assert.LessOrEqual(stage.cameraMinY,heights.Min()+1.9f);
                Assert.GreaterOrEqual(stage.cameraMaxY,heights.Max()+4);
                Assert.GreaterOrEqual(stage.route.Count(r=>r.values[3]!=0),6);
                foreach(var checkpoint in stage.checkpoints)
                {
                    float x=checkpoint.values[0]/100;
                    Assert.IsTrue(stage.sections.Any(s=>s.start<=x && x<s.end && s.pressure==0));
                }
                foreach(var zone in stage.territories)
                    Assert.AreEqual(2,stage.enemies.Count(e=>e.territory==zone.id));
            }
        }
        [Test] public void BossProgressionAddsPressureAndFinalFormExceedsAllGuardians()
        {
            var campaign=CampaignData.Load();
            for(int stage=1;stage<6;stage++)
            {
                var before=BossTuning.For(stage-1,false,1,false); var after=BossTuning.For(stage,false,1,false);
                Assert.Less(after.Warning,before.Warning); Assert.Less(after.Recovery,before.Recovery);
                Assert.Greater(after.BulletSpeed,before.BulletSpeed);
                Assert.Greater(campaign.stages[stage].bossHealth,campaign.stages[stage-1].bossHealth);
            }
            var last=BossTuning.For(5,false,2,false); var final=BossTuning.For(5,true,3,false);
            Assert.Greater(BossTuning.FinalHealth,campaign.stages[5].bossHealth);
            Assert.Less(final.Warning,last.Warning); Assert.Less(final.Idle,last.Idle); Assert.Less(final.Recovery,last.Recovery);
            Assert.Greater(final.FanCount,last.FanCount); Assert.Greater(final.DangerPanels,last.DangerPanels);
            for(int phase=1;phase<=3;phase++)
            {
                var normal=BossTuning.For(5,true,phase,false); var assist=BossTuning.For(5,true,phase,true);
                Assert.GreaterOrEqual(normal.Warning,.9f); Assert.Greater(assist.Warning,normal.Warning);
                Assert.LessOrEqual(assist.DangerPanels,normal.DangerPanels);
            }
        }
        [Test] public void EveryArenaPatternPreservesExitLandingAndAdjacentEscapeGround()
        {
            for(int occupied=0;occupied<12;occupied++)
            for(int landing=0;landing<12;landing++)
            for(int seed=0;seed<24;seed++)
            {
                var plan=ArenaPattern.Select(12,4,seed,occupied,landing);
                Assert.LessOrEqual(plan.Length,4); Assert.AreEqual(plan.Length,plan.Distinct().Count());
                foreach(int tile in plan)
                {
                    Assert.That(tile,Is.InRange(1,10));
                    Assert.Greater(System.Math.Abs(tile-occupied),1); Assert.Greater(System.Math.Abs(tile-landing),1);
                    Assert.IsFalse(plan.Contains(tile-1) || plan.Contains(tile+1));
                }
            }
        }
    }
}
