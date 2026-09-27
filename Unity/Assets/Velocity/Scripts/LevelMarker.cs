using UnityEngine;
namespace Velocity
{
    public enum MarkerKind { Floor, Platform, Moving, Crumble, Spike, Laser, Spring, Checkpoint, Coin, Relic, Enemy }
    /// <summary>Authoring marker. Positions are feet / left-top edges, in Unity metres.</summary>
    public class LevelMarker : MonoBehaviour
    {
        public MarkerKind Kind;
        [Min(.1f)] public float Width=2, Height=1.8f;
        public Vector2 Amplitude=new Vector2(.5f,.5f);
        [Min(.1f)] public float Period=3.6f;
        public float Phase;
        public string EnemyKind="mushroom";
        [Tooltip("Enemy operator: matching StageLayout territory ID; -1 for a regular enemy.")]
        public int TerritoryId=-1;
        [Range(1,3)] public int Pressure=1;
        void OnDrawGizmos()
        {
            var matrix=Gizmos.matrix;
            Gizmos.matrix=transform.localToWorldMatrix;
            bool slab=Kind==MarkerKind.Floor || Kind==MarkerKind.Platform || Kind==MarkerKind.Moving || Kind==MarkerKind.Crumble;
            Gizmos.color=slab?new Color(.25f,.7f,1,.65f):Kind==MarkerKind.Enemy?Color.red:Kind==MarkerKind.Checkpoint?Color.green:Color.yellow;
            if(slab) Gizmos.DrawWireCube(new Vector3(Width/2,-.18f,0),new Vector3(Width,.36f,2.2f));
            else if(Kind==MarkerKind.Laser) Gizmos.DrawLine(Vector3.zero,Vector3.up*Height);
            else if(Kind==MarkerKind.Spike) Gizmos.DrawWireCube(new Vector3(Width/2,.1f,0),new Vector3(Width,.2f,.6f));
            else Gizmos.DrawWireSphere(Vector3.up*(Kind==MarkerKind.Enemy?.35f:0),Kind==MarkerKind.Enemy?.35f:.16f);
            if(Kind==MarkerKind.Moving) Gizmos.DrawLine(-(Vector3)Amplitude,(Vector3)Amplitude);
            Gizmos.matrix=matrix;
        }
    }
}
