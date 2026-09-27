using System;
using System.IO;
using NUnit.Framework;
using UnityEngine;
namespace Velocity.Tests
{
    public class CampaignAndSaveTests
    {
        [Test] public void SixReferenceBiomesHaveSafeCheckpointsAndFinalVexarEncounter()
        {
            var campaign=CampaignData.Load(); Assert.AreEqual(6,campaign.stages.Length);
            var biomes=new[]{"jungle","desert","mountain","ice","volcano","industrial"};
            for(int i=0;i<campaign.stages.Length;i++)
            {
                var s=campaign.stages[i]; Assert.AreEqual(biomes[i],s.biome);
                Assert.AreEqual(2400,s.length-s.arena,.1f); Assert.GreaterOrEqual(s.length,40000);
                Assert.GreaterOrEqual(s.checkpoints.Length,5); Assert.AreEqual(3,s.relics.Length);
                Assert.Greater(s.enemies.Length,10); Assert.Greater(s.gems.Length,30);
                Assert.Greater(s.spawn.x,0); Assert.AreEqual(0,s.spawn.z);
                foreach(var checkpoint in s.checkpoints)
                {
                    var p=checkpoint.values;
                    Assert.IsTrue(Array.Exists(s.floors,r=>r.values[0]<=p[0] && p[0]+70<r.values[0]+r.values[2] && p[1]==r.values[1]),"Unsafe checkpoint in "+i);
                }
            }
            Assert.AreEqual("vexar_feral",campaign.stages[5].finalBossArt);
            Assert.Less(campaign.stages[3].friction,campaign.stages[0].friction);
            Assert.AreEqual(new Vector3(1.7f,0,0),CampaignData.Point(170,620));
        }
        [Test] public void EveryWeaponFallsBackToBlasterWhenEnergyIsEmpty()
        {
            Assert.AreEqual(6,WeaponCatalog.Count);
            for(int i=1;i<WeaponCatalog.Count;i++)
            {
                Assert.AreEqual(0,WeaponCatalog.Resolve(i,0));
                Assert.AreEqual(i,WeaponCatalog.Resolve(i,WeaponCatalog.Get(i).Cost));
            }
            Assert.Greater(WeaponCatalog.Get((int)WeaponKind.Scatter).Pellets,1);
            Assert.Greater(WeaponCatalog.Get((int)WeaponKind.Rocket).Splash,0);
            Assert.Greater(WeaponCatalog.Get((int)WeaponKind.Ice).Freeze,0);
        }
        [Test] public void LegacySaveRetainsSettingsAndUnlocksWithoutReusingScoresForDifferentLevels()
        {
            var legacy=new SaveData{version=1,unlocked=4,music=.2f,best=new BestRun[5]};
            legacy.best[0]=new BestRun{score=999}; SaveStore.Validate(legacy);
            Assert.AreEqual(3,legacy.version); Assert.AreEqual(6,legacy.best.Length); Assert.AreEqual(4,legacy.unlocked);
            Assert.AreEqual(.2f,legacy.music); Assert.IsNull(legacy.best[0]);
            var shortCampaign=new SaveData{version=2,unlocked=5,assist=true}; shortCampaign.best[0]=new BestRun{seconds=20};
            SaveStore.Validate(shortCampaign); Assert.AreEqual(3,shortCampaign.version);
            Assert.IsNull(shortCampaign.best[0]); Assert.AreEqual(5,shortCampaign.unlocked); Assert.IsTrue(shortCampaign.assist);
        }
        [Test] public void SaveKeepsBestValuesAndRecoversBackupAfterCorruption()
        {
            string dir=Path.Combine(Path.GetTempPath(),"aero-test-"+Guid.NewGuid());
            try
            {
                var save=new SaveStore(dir); save.Complete(0,500,80,10,2); Assert.IsNull(save.Error);
                save.Complete(0,400,90,8,1); Assert.IsNull(save.Error);
                var loaded=new SaveStore(dir); Assert.AreEqual(1,loaded.Data.unlocked);
                Assert.AreEqual(500,loaded.Data.best[0].score); Assert.AreEqual(80,loaded.Data.best[0].seconds);
                File.WriteAllText(Path.Combine(dir,"velocity_unity_save.json"),"broken");
                var recovered=new SaveStore(dir); Assert.AreEqual(500,recovered.Data.best[0].score);
            }
            finally { if(Directory.Exists(dir)) Directory.Delete(dir,true); }
        }
        [Test] public void FinalStageCompletionAndInvalidSaveBounds()
        {
            var store=new SaveStore(null,true); store.Complete(5,9000,90,20,3);
            Assert.AreEqual(5,store.Data.unlocked); Assert.IsNotNull(store.Data.best[5]);
            Assert.Throws<ArgumentOutOfRangeException>(()=>store.Complete(6,0,0,0,0));
            Assert.Throws<InvalidDataException>(()=>SaveStore.Validate(new SaveData{version=99}));
            var save=new SaveData{unlocked=999,music=float.NaN}; SaveStore.Validate(save);
            Assert.AreEqual(5,save.unlocked); Assert.AreEqual(.65f,save.music);
        }
    }
}
