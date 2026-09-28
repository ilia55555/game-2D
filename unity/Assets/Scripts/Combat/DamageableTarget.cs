using System.Collections;
using UnityEngine;

namespace ProjectVelocity
{
    public sealed class DamageableTarget : MonoBehaviour, IDamageable
    {
        [SerializeField] private int maximumHealth = 100;
        private int _health;
        private Vector3 _spawnPosition;
        private Renderer _renderer;

        private void Awake()
        {
            _health = maximumHealth;
            _spawnPosition = transform.position;
            _renderer = GetComponent<Renderer>();
        }

        public void TakeDamage(int amount, Vector3 hitPoint, Vector3 direction)
        {
            _health -= amount;
            ImpactVfx.Spawn(hitPoint, new Color(1f, 0.2f, 0.4f), 20);
            StartCoroutine(HitReaction(direction));

            if (_health <= 0)
            {
                StartCoroutine(Respawn());
            }
        }

        private IEnumerator HitReaction(Vector3 direction)
        {
            Vector3 originalPosition = transform.position;
            transform.position += direction * 0.12f;
            yield return new WaitForSeconds(0.08f);
            transform.position = originalPosition;
        }

        private IEnumerator Respawn()
        {
            _renderer.enabled = false;
            GetComponent<Collider>().enabled = false;
            yield return new WaitForSeconds(1.2f);
            transform.position = _spawnPosition;
            _health = maximumHealth;
            _renderer.enabled = true;
            GetComponent<Collider>().enabled = true;
        }
    }
}
