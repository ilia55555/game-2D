using UnityEngine;
namespace Velocity
{
    public class SideCamera : MonoBehaviour
    {
        public WorldSession World;
        public float Distance = 10.5f, SmoothTime = .18f;
        Vector3 velocity, smoothPosition;
        float shake;
        Vector3 Target()
        {
            Vector3 p=World.Player.transform.position;
            float halfWidth=Mathf.Tan(GetComponent<Camera>().fieldOfView*.5f*Mathf.Deg2Rad)*Distance*GetComponent<Camera>().aspect;
            float left=World.BossStarted && !World.BossDefeated ? World.Data.arena/100 : 0;
            float right=World.Data.length/100;
            float x=right-left>halfWidth*2 ? Mathf.Clamp(p.x+World.Player.Facing*.9f,left+halfWidth,right-halfWidth) : (left+right)/2;
            return new Vector3(x,Mathf.Clamp(p.y+1.9f,1.9f,6),-Distance);
        }
        public void Snap() { smoothPosition=Target(); transform.position=smoothPosition; velocity=Vector3.zero; transform.rotation=Quaternion.identity; }
        public void Shake(float amount) { if(World.App.Save.Data.shake) shake=Mathf.Max(shake,amount); }
        void LateUpdate()
        {
            if(!World || !World.Player || !World.Running) return;
            smoothPosition=Vector3.SmoothDamp(smoothPosition,Target(),ref velocity,SmoothTime);
            shake=Mathf.Max(0,shake-Time.deltaTime*.4f);
            transform.position=smoothPosition+new Vector3(Mathf.Sin(Time.time*81),Mathf.Cos(Time.time*67),0)*shake;
            // Fixed lateral orientation: player never runs toward the camera.
            transform.rotation=Quaternion.identity;
        }
    }
}
