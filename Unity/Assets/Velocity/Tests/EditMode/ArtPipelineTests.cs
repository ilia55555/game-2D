using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using Velocity.Editor;
namespace Velocity.Tests
{
    public class ArtPipelineTests
    {
        [Test] public void EditablePrefabRoundTripsAllSixAuthoredRoutes()
        {
            foreach(var source in CampaignData.Load().stages)
            {
                GameObject prefab=null;
                try
                {
                    prefab=AeroStageEditor.Create(source);
                    var output=prefab.GetComponent<StageLayout>().Export(source);
                    Assert.AreEqual(source.index,output.index); Assert.AreEqual(source.length,output.length,.01f);
                    Assert.AreEqual(source.bossArt,output.bossArt); Assert.AreEqual(source.finalBossArt,output.finalBossArt);
                    Assert.AreEqual(source.enemies.Length,output.enemies.Length);
                    foreach(var name in new[]{"floors","platforms","moving","crumble","spikes","lasers","springs","checkpoints","gems","relics"})
                    {
                        var field=typeof(StageData).GetField(name);
                        var a=((Row[])field.GetValue(source)).OrderBy(r=>r.values[0]).ThenBy(r=>r.values[1]).ToArray();
                        var b=((Row[])field.GetValue(output)).OrderBy(r=>r.values[0]).ThenBy(r=>r.values[1]).ToArray();
                        Assert.AreEqual(a.Length,b.Length,name);
                        for(int i=0;i<a.Length;i++) for(int j=0;j<a[i].values.Length;j++) Assert.AreEqual(a[i].values[j],b[i].values[j],.02f,name);
                    }
                }
                finally { if(prefab) AssetDatabase.DeleteAsset(AssetDatabase.GetAssetPath(prefab)); }
            }
        }
        [Test] public void AnimatorBuilderWiresImportedActionsAndLocksDeath()
        {
            const string folder="Assets/AeroTemporaryTestClips";
            string testFolder=AssetDatabase.GenerateUniqueAssetPath(folder);
            AssetDatabase.CreateFolder("Assets",testFolder.Substring("Assets/".Length));
            string controllerPath=null;
            try
            {
                var clips=new List<AnimationClip>();
                foreach(var name in new[]{"Idle","Run","Jump","Fall","Fire","Death","Transform"})
                {
                    var clip=new AnimationClip{name=name};
                    clip.SetCurve("",typeof(Transform),"localPosition.y",AnimationCurve.Constant(0,1,0));
                    AssetDatabase.CreateAsset(clip,testFolder+"/"+name+".anim"); clips.Add(clip);
                }
                var controller=AeroArtSetup.CreateController("test_actor",clips.ToArray()); controllerPath=AssetDatabase.GetAssetPath(controller);
                Assert.IsTrue(controller.parameters.Any(p=>p.name=="Dead" && p.type==AnimatorControllerParameterType.Bool));
                Assert.IsTrue(controller.parameters.Any(p=>p.name=="Fire" && p.type==AnimatorControllerParameterType.Trigger));
                var machine=controller.layers[0].stateMachine;
                var death=machine.states.Single(s=>s.state.name=="Death").state;
                Assert.AreEqual(0,death.transitions.Length,"Death must not transition back to locomotion");
                var fire=machine.states.Single(s=>s.state.name=="Fire").state;
                Assert.AreSame(clips.Single(c=>c.name=="Fire"),fire.motion);
            }
            finally
            {
                if(controllerPath!=null) AssetDatabase.DeleteAsset(controllerPath);
                AssetDatabase.DeleteAsset(testFolder);
            }
        }
    }
}
