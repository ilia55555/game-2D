using UnityEngine;
namespace Velocity
{
    [DefaultExecutionOrder(-20)]
    public class PlatformMotion : MonoBehaviour
    {
        public WorldSession World;
        public Vector3 Amplitude, Origin;
        public Vector3 Delta { get; private set; }
        public float Period = 3;
        public bool Crumble, OneWay;
        public float Surface;
        float clock, breaking = -1, restore;
        Collider surfaceCollider;
        Renderer[] visuals;
        bool[] visibility;
        void Start()
        {
            Origin=transform.position; surfaceCollider=GetComponent<Collider>(); visuals=GetComponentsInChildren<Renderer>();
            visibility=new bool[visuals.Length]; for(int i=0;i<visuals.Length;i++) visibility[i]=visuals[i].enabled;
        }
        public void StandOn() { if (Crumble && breaking < 0 && restore <= 0) breaking = .7f; }
        void Update()
        {
            Delta = Vector3.zero; if (!World || !World.Running) return;
            clock += Time.deltaTime;
            Vector3 next = Origin + Amplitude * Mathf.Sin(clock * Mathf.PI * 2 / Period);
            Delta = next - transform.position; transform.position = next;
            if (OneWay)
                foreach (var actor in World.Characters)
                    if (actor && actor.enabled)
                    {
                        float feet = actor.transform.position.y;
                        var player = actor.GetComponent<PlayerMotor>();
                        bool ascending = player && player.Velocity.y > .1f;
                        Physics.IgnoreCollision(surfaceCollider, actor, ascending || feet < surfaceCollider.bounds.max.y - .09f);
                    }
            if (!Crumble) return;
            if (breaking >= 0)
            {
                breaking -= Time.deltaTime;
                if (breaking < 0) { restore = 3; surfaceCollider.enabled = false; foreach (var r in visuals) r.enabled = false; }
            }
            else if (restore > 0)
            {
                restore -= Time.deltaTime;
                if (restore <= 0)
                {
                    bool occupied = false;
                    Bounds area = new Bounds(transform.position, transform.lossyScale + new Vector3(.3f,.15f,.3f));
                    foreach (var c in World.Characters) if (c && c.enabled && area.Intersects(c.bounds)) { occupied = true; break; }
                    if (occupied) restore = .3f;
                    else { surfaceCollider.enabled=true; for(int i=0;i<visuals.Length;i++) if(visuals[i]) visuals[i].enabled=visibility[i]; }
                }
            }
        }
    }
}
