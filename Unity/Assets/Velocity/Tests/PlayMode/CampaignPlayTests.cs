using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
namespace Velocity.Tests
{
    public class CampaignPlayTests
    {
        GameApp app;
        [UnitySetUp] public IEnumerator Setup()
        {
            GameApp.SuppressSaveForTests=true; yield return SceneManager.LoadSceneAsync("Main");
            app=Object.FindFirstObjectByType<GameApp>(); Assert.IsNotNull(app); app.Save.Data.unlocked=5;
        }
        [UnityTearDown] public IEnumerator TearDown()
        {
            if(app) Object.Destroy(app.gameObject); yield return null; GameApp.SuppressSaveForTests=false; Time.timeScale=1;
        }
        [UnityTest] public IEnumerator AllSixStagesBootWithThreeDimensionalPhysicsAndSideCamera()
        {
            for(int stage=0;stage<6;stage++)
            {
                app.StartStage(stage); yield return null; yield return new WaitForSeconds(.15f);
                var w=app.World; Assert.AreEqual(stage,w.Index); Assert.IsNotNull(w.Player); Assert.IsNotNull(w.Boss);
                Assert.Greater(w.GetComponentsInChildren<Collider>().Length,20);
                Assert.AreEqual(0,w.Player.transform.position.z,.001f);
                Assert.Less(Vector3.Angle(w.Camera.transform.forward,Vector3.forward),.01f);
                Assert.IsFalse(w.Camera.GetComponent<Camera>().orthographic);
                Assert.AreEqual(w.Data.spawn.x,w.Player.transform.position.x,.01f);
            }
        }
        EnemyActor Target(WorldSession w,Vector3 position)
        {
            var go=new GameObject("Test turret"); go.transform.SetParent(w.transform); go.transform.position=position;
            var enemy=go.AddComponent<EnemyActor>(); enemy.Initialize(w,"turret"); return enemy;
        }
        [UnityTest] public IEnumerator SweptCollisionHitsAndSplashDoesNotDoubleHitPrimaryTarget()
        {
            app.StartStage(0); yield return null; var w=app.World;
            var enemy=Target(w,new Vector3(3,.02f,0));
            w.Shoot(new Vector3(2.3f,.3f,0),Vector3.right*100,true,1,"player_pulse");
            yield return new WaitForSeconds(.12f); Assert.AreEqual(5,enemy.Health);
            w.Shoot(new Vector3(2.3f,.3f,0),Vector3.right*100,true,1,"player_rocket");
            yield return new WaitForSeconds(.12f); Assert.AreEqual(4,enemy.Health);
        }
        [UnityTest] public IEnumerator LaserPiercesSeparateTargetsAndIceFreezesItsTarget()
        {
            app.StartStage(0); yield return null; var w=app.World;
            var first=Target(w,new Vector3(2.5f,.02f,0)); var second=Target(w,new Vector3(3.6f,.02f,0));
            w.Shoot(new Vector3(1.9f,.3f,0),Vector3.right*100,true,1,"player_laser");
            yield return new WaitForSeconds(.12f); Assert.AreEqual(5,first.Health); Assert.AreEqual(5,second.Health);
            w.Shoot(new Vector3(1.9f,.3f,0),Vector3.right*100,true,1,"player_ice");
            yield return new WaitForSeconds(.12f); Assert.IsTrue(first.Frozen); Assert.AreEqual(4,first.Health);
        }
        [UnityTest] public IEnumerator WallStopsProjectileBeforeTarget()
        {
            app.StartStage(0); yield return null; var w=app.World;
            var enemy=Target(w,new Vector3(3.6f,.02f,0));
            Geometry.Box("Test wall",w.transform,new Vector3(2.8f,.5f,0),new Vector3(.15f,1,2),Color.gray,true);
            Physics.SyncTransforms(); w.Shoot(new Vector3(2,.3f,0),Vector3.right*150,true,10,"player_laser");
            yield return new WaitForSeconds(.12f); Assert.AreEqual(6,enemy.Health);
        }
        [UnityTest] public IEnumerator BossRetryClearsArenaAndRestoresCheckpoint()
        {
            app.StartStage(0); yield return null; var w=app.World;
            w.Checkpoint=new Vector3(13.55f,.02f,0); w.StartBoss();
            w.Player.Die(); yield return new WaitForSeconds(1.3f);
            Assert.IsFalse(w.BossStarted); Assert.IsFalse(w.Player.Dead); Assert.AreEqual(w.Boss.MaxHealth,w.Boss.Health);
            Assert.AreEqual(w.Checkpoint.x,w.Player.transform.position.x,.05f);
            Assert.AreEqual(0,w.GetComponentsInChildren<Projectile>().Length);
        }
        [UnityTest] public IEnumerator IronhornLeadsToThreeVexarFormsBeforeFinalGateUnlocks()
        {
            app.StartStage(5); yield return null; var w=app.World;
            w.Finish(); Assert.IsFalse(w.Completed); w.StartBoss(); yield return new WaitForSeconds(1.9f);
            w.Boss.Hit(100000); Assert.IsTrue(w.FinalEncounter); Assert.IsFalse(w.BossDefeated);
            yield return new WaitForSeconds(3.8f); Assert.IsTrue(w.Boss.IsFinal);
            w.Boss.Hit(100000); Assert.AreEqual(2,w.Boss.Phase); Assert.IsFalse(w.BossDefeated);
            yield return new WaitForSeconds(2.2f);
            w.Boss.Hit(100000); Assert.AreEqual(3,w.Boss.Phase); Assert.IsFalse(w.BossDefeated);
            yield return new WaitForSeconds(2.2f);
            w.Boss.Hit(100000); Assert.IsTrue(w.BossDefeated);
            w.Finish(); Assert.IsTrue(w.Completed); Assert.IsNotNull(app.Save.Data.best[5]);
        }
    }
}
