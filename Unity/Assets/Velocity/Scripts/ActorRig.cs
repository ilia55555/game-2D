using UnityEngine;
namespace Velocity
{
    /// <summary>Optional explicit sockets on a Blender prefab. Named sockets also work.</summary>
    public class ActorRig : MonoBehaviour
    {
        public Animator Animator;
        public Transform Muzzle;
        public Transform WeaponSocket;
        [Tooltip("Meshes for a gun already modelled into the character; hidden when a separate weapon is equipped.")]
        public GameObject[] BuiltInWeaponParts;
    }
}
