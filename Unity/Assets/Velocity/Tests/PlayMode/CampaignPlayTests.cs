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
            GameApp.SuppressSaveForTests=true;
            yield return SceneManager.LoadSceneAsync("Main");
            app=Object.FindFirstObjectByType<GameApp>(); Assert.IsNotNull(app);
            app.Save.Data.unlocked=4;
        }
        [UnityTearDown] public IEnumerator TearDown()
        {
            if(app) Object.Destroy(app.gameObject); yield return null; GameApp.SuppressSaveForTests=false;
        }
        [UnityTest] public IEnumerator AllStagesBootWithThreeDimensionalPhysicsAndSideCamera()
        {
            for(int stage=0;stage<5;stage++)
            {
                app.StartStage(stage); yield return null; yield return new WaitForSeconds(.15f);
                var w=app.World; Assert.AreEqual(stage,w.Index); Assert.IsNotNull(w.Player); Assert.IsNotNull(w.Boss);
                Assert.Greater(w.GetComponentsInChildren<Collider>().Length,20);
                Assert.AreEqual(0,w.Player.transform.position.z,.001f);
                Assert.Less(Vector3.Angle(w.Camera.transform.forward,Vector3.forward),.01f);
                Assert.IsFalse(w.Camera.GetComponent<Camera>().orthographic);
            }
        }
        [UnityTest] public IEnumerator HighSpeedProjectileHitsTargetAndNovaDoesNotDoubleHitIt()
        {
            app.StartStage(0); yield return null;
            var w=app.World;
            var go=new GameObject("Test turret"); go.transform.SetParent(w.transform); go.transform.position=new Vector3(3,.02f,0);
            var enemy=go.AddComponent<EnemyActor>(); enemy.Initialize(w,"turret");
            w.Shoot(new Vector3(2.3f,.3f,0),Vector3.right*100,true,1,"player_pulse");
            yield return new WaitForSeconds(.12f); Assert.AreEqual(3,enemy.Health);
            w.Shoot(new Vector3(2.3f,.3f,0),Vector3.right*100,true,1,"player_nova");
            yield return new WaitForSeconds(.12f); Assert.AreEqual(2,enemy.Health);
        }
        [UnityTest] public IEnumerator BossRetryClearsArenaAndRestoresCheckpoint()
        {
            app.StartStage(0); yield return null; var w=app.World;
            w.Checkpoint=new Vector3(29.55f,.02f,0); w.StartBoss(); Assert.IsTrue(w.BossStarted);
            w.Player.Die(); yield return new WaitForSeconds(1.3f);
            Assert.IsFalse(w.BossStarted); Assert.IsFalse(w.Player.Dead); Assert.AreEqual(w.Boss.MaxHealth,w.Boss.Health);
            Assert.AreEqual(w.Checkpoint.x,w.Player.transform.position.x,.05f);
            Assert.AreEqual(0,w.GetComponentsInChildren<Projectile>().Length);
        }
        [UnityTest] public IEnumerator BossGatePreventsPrematureCompletion()
        {
            app.StartStage(0); yield return null; var w=app.World;
            w.Finish(); Assert.IsFalse(w.Completed);
            w.BossDied(); w.Finish(); Assert.IsTrue(w.Completed); Assert.IsNotNull(app.Save.Data.best[0]);
        }
    }
}
