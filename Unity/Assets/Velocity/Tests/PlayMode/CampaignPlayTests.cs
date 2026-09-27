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
            var checkpoint=w.Data.checkpoints[1].values;
            w.Checkpoint=CampaignData.Point(checkpoint[0]+55,checkpoint[1])+Vector3.up*.02f; w.StartBoss();
            w.Arena.Prepare(2,2,false,0,w.Player.transform.position,w.Boss.transform.position,w.Boss.transform.position);
            w.Arena.Execute(); w.Arena.Impact(); Assert.Greater(w.Arena.MissingPanels,0);
            w.Player.Die(); yield return new WaitForSeconds(1.3f);
            Assert.IsFalse(w.BossStarted); Assert.IsFalse(w.Player.Dead); Assert.AreEqual(w.Boss.MaxHealth,w.Boss.Health);
            Assert.AreEqual(w.Checkpoint.x,w.Player.transform.position.x,.05f);
            Assert.AreEqual(0,w.GetComponentsInChildren<Projectile>().Length);
            Assert.AreEqual(0,w.Arena.MissingPanels); Assert.IsFalse(w.Arena.HazardActive); Assert.IsFalse(w.Arena.Warning);
        }
        [UnityTest] public IEnumerator DeepValleyIsPlayableAndCameraFollowsBelowZero()
        {
            app.StartStage(0); yield return null; var w=app.World;
            var checkpoint=w.Data.checkpoints[1].values;
            var point=CampaignData.Point(checkpoint[0]+55,checkpoint[1]); Assert.Less(point.y,-3);
            w.Player.Teleport(point+Vector3.up*.04f); w.Camera.Snap();
            yield return new WaitForSeconds(.4f);
            Assert.IsFalse(w.Player.Dead); Assert.AreEqual(point.y,w.Player.transform.position.y,.1f);
            Assert.Less(w.Camera.transform.position.y,-1);
            w.Player.Teleport(new Vector3(point.x,w.Data.killY-3,0)); yield return null;
            Assert.IsTrue(w.Player.Dead,"Falling beyond the per-stage boundary must still kill the player");
        }
        [UnityTest] public IEnumerator SlamGroundWaitsForImpactAndFallingPlayerReturnsToSafePanel()
        {
            app.StartStage(0); yield return null; var w=app.World; w.StartBoss(); w.Boss.enabled=false;
            var a=w.Arena; var boss=w.Boss.transform.position;
            a.Prepare(2,2,false,0,new Vector3(w.Data.arena/100+6,0,0),boss,boss);
            Assert.Greater(a.PlannedPanels.Length,0); int panel=a.PlannedPanels[0];
            w.Player.Teleport(new Vector3(a.PanelCenter(panel),.04f,0)); int health=w.Player.Health;
            yield return new WaitForSeconds(.15f);
            Assert.IsTrue(a.Warning); Assert.AreEqual(health,w.Player.Health); Assert.AreEqual(0,a.MissingPanels);
            a.Execute(); yield return null;
            Assert.AreEqual(0,a.MissingPanels,"The jump launch must not collapse the floor");
            a.Impact(); Physics.SyncTransforms(); Assert.Greater(a.MissingPanels,0);
            Assert.IsFalse(Physics.Raycast(new Vector3(a.PanelCenter(panel),.3f,0),Vector3.down,.9f,Layers.TerrainMask),"No invisible base floor beneath a removed panel");
            yield return new WaitForSeconds(.65f);
            Assert.IsFalse(w.Player.Dead); Assert.Greater(w.Player.transform.position.y,-.1f);
            Assert.AreEqual(health-1,w.Player.Health);
            a.ResetArena(); Physics.SyncTransforms();
            Assert.AreEqual(0,a.MissingPanels); Assert.IsFalse(a.HazardActive);
            Assert.IsTrue(Physics.Raycast(new Vector3(a.PanelCenter(panel),.3f,0),Vector3.down,.9f,Layers.TerrainMask));
        }
        [UnityTest] public IEnumerator ChargeKeepsFloorIntactAndEscapeLedgeCarriesPlayer()
        {
            app.StartStage(5); yield return null; var w=app.World; w.StartBoss(); w.Boss.enabled=false;
            var ledge=System.Array.Find(w.GetComponentsInChildren<PlatformMotion>(),m=>m.name=="Boss escape ledge 0");
            Assert.IsNotNull(ledge); float y=ledge.GetComponent<Collider>().bounds.max.y;
            w.Player.Teleport(new Vector3(ledge.transform.position.x,y+.035f,0)); yield return new WaitForSeconds(.1f);
            float original=w.Player.transform.position.y; var boss=w.Boss.transform.position;
            w.Arena.Prepare(1,3,true,1,w.Player.transform.position,boss,boss); w.Arena.Execute();
            yield return new WaitForSeconds(.5f);
            Assert.AreEqual(0,w.Arena.MissingPanels); Assert.Greater(w.Player.transform.position.y,original+.1f);
            Assert.IsTrue(w.Player.Grounded,"Escape ledge must carry its rider while rising");
        }
        [UnityTest] public IEnumerator LastOperatorDeathCancelsWarningAndPermanentlyLiberatesTerritory()
        {
            app.StartStage(0); yield return null; var w=app.World; var zone=w.Territories[0];
            foreach(var enemy in w.GetComponentsInChildren<EnemyActor>()) enemy.Freeze(20);
            zone.Operators[0].Hit(1000); yield return null; Assert.IsFalse(zone.Cleared);
            w.Player.Teleport(new Vector3(zone.Data.start+2,zone.Data.y+.03f,0)); int health=w.Player.Health;
            float limit=Time.time+4;
            while(!zone.Warning && Time.time<limit) yield return null;
            Assert.IsTrue(zone.Warning); Assert.AreEqual(health,w.Player.Health,"Telegraph alone cannot hurt");
            zone.Operators[1].Hit(1000); yield return null;
            Assert.IsTrue(zone.Cleared); Assert.IsFalse(zone.Warning); Assert.IsFalse(zone.HazardActive);
            yield return new WaitForSeconds(2);
            Assert.IsFalse(zone.HazardActive); Assert.AreEqual(health,w.Player.Health);
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
