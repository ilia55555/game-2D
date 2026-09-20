using System;
using System.IO;
using NUnit.Framework;
using UnityEngine;
namespace Velocity.Tests
{
    public class CampaignAndSaveTests
    {
        [Test] public void AllFiveAuthoredStagesHaveAnArenaAndThreeCheckpoints()
        {
            var campaign=CampaignData.Load(); Assert.AreEqual(5,campaign.stages.Length);
            float[] lengths={8800,9600,10000,10600,11400};
            for(int i=0;i<5;i++)
            {
                var s=campaign.stages[i]; Assert.AreEqual(lengths[i],s.length); Assert.AreEqual(s.length-1400,s.arena);
                Assert.AreEqual(3,s.checkpoints.Length); Assert.AreEqual(3,s.relics.Length);
                Assert.Greater(s.enemies.Length,10); Assert.Greater(s.gems.Length,30);
                foreach(var checkpoint in s.checkpoints)
                {
                    bool grounded=false; var p=checkpoint.values;
                    foreach(var floor in s.floors) { var f=floor.values; grounded|=p[0]>=f[0] && p[0]+55<f[0]+f[2] && p[1]==f[1]; }
                    Assert.IsTrue(grounded,"Unsafe checkpoint in stage "+i);
                }
            }
            Assert.AreEqual(new Vector3(1.7f,0,0),CampaignData.Point(170,620));
            Assert.Greater(CampaignData.Point(0,300).y,0,"Y must be inverted from Godot coordinates");
        }
        [Test] public void SaveKeepsBestValuesAndRecoversBackupAfterCorruption()
        {
            string dir=Path.Combine(Path.GetTempPath(),"velocity-test-"+Guid.NewGuid());
            try
            {
                var save=new SaveStore(dir); save.Complete(0,500,80,10,2); Assert.IsNull(save.Error);
                save.Complete(0,400,90,8,1); Assert.IsNull(save.Error);
                var loaded=new SaveStore(dir); Assert.AreEqual(1,loaded.Data.unlocked);
                Assert.AreEqual(500,loaded.Data.best[0].score); Assert.AreEqual(80,loaded.Data.best[0].seconds);
                File.WriteAllText(Path.Combine(dir,"velocity_unity_save.json"),"broken");
                var recovered=new SaveStore(dir); Assert.AreEqual(500,recovered.Data.best[0].score);
                Assert.AreEqual(2,recovered.Data.best[0].relics);
            }
            finally { if(Directory.Exists(dir)) Directory.Delete(dir,true); }
        }
        [Test] public void CorruptedVersionDoesNotUnlockCampaign()
        {
            Assert.Throws<InvalidDataException>(()=>SaveStore.Validate(new SaveData{version=99}));
            var save=new SaveData{unlocked=999,music=float.NaN}; SaveStore.Validate(save);
            Assert.AreEqual(4,save.unlocked); Assert.AreEqual(.65f,save.music);
        }
    }
}
