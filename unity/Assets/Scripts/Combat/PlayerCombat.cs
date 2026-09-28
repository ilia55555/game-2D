using UnityEngine;

namespace ProjectVelocity
{
    public sealed class PlayerCombat : MonoBehaviour
    {
        [SerializeField] private int meleeDamage = 35;
        [SerializeField] private int projectileDamage = 20;
        [SerializeField] private float meleeRange = 1.35f;
        [SerializeField] private float attackCooldown = 0.28f;
        [SerializeField] private float projectileSpeed = 18f;

        private Transform _weaponSocket;
        private ProceduralAudio _audio;
        private float _nextAttackTime;
        private int _facing = 1;

        public void Configure(Transform weaponSocket)
        {
            _weaponSocket = weaponSocket;
        }

        public void SetFacing(int facing)
        {
            _facing = facing;
        }

        private void Start()
        {
            _audio = GetComponent<ProceduralAudio>();
        }

        private void Update()
        {
            if (Input.GetKeyDown(KeyCode.J))
            {
                MeleeAttack();
            }

            if (Input.GetKeyDown(KeyCode.K))
            {
                Shoot();
            }
        }

        private void MeleeAttack()
        {
            if (Time.time < _nextAttackTime)
            {
                return;
            }

            _nextAttackTime = Time.time + attackCooldown;
            Vector3 center = transform.position + Vector3.right * (_facing * meleeRange * 0.7f);
            Collider[] hits = Physics.OverlapBox(center, new Vector3(meleeRange * 0.5f, 0.75f, 0.8f), Quaternion.identity, ~0, QueryTriggerInteraction.Ignore);
            foreach (Collider hit in hits)
            {
                IDamageable damageable = hit.GetComponent<IDamageable>();
                if (damageable != null)
                {
                    damageable.TakeDamage(meleeDamage, hit.ClosestPoint(center), Vector3.right * _facing);
                }
            }

            _audio.PlaySlash();
            ImpactVfx.Spawn(center, new Color(0.35f, 0.95f, 1f), 14);
        }

        private void Shoot()
        {
            if (Time.time < _nextAttackTime)
            {
                return;
            }

            _nextAttackTime = Time.time + attackCooldown;
            Vector3 direction = Vector3.right * _facing;
            Vector3 origin = _weaponSocket.position + direction * 0.65f;
            Projectile.Spawn(origin, direction, projectileSpeed, projectileDamage, gameObject);
            _audio.PlayShot();
            ImpactVfx.Spawn(origin, new Color(0.4f, 0.9f, 1f), 7);
        }
    }
}
