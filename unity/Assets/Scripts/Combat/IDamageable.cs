using UnityEngine;

namespace ProjectVelocity
{
    public interface IDamageable
    {
        void TakeDamage(int amount, Vector3 hitPoint, Vector3 direction);
    }
}
