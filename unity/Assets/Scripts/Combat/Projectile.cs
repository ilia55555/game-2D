using UnityEngine;

namespace ProjectVelocity
{
    public sealed class Projectile : MonoBehaviour
    {
        private Vector3 _velocity;
        private int _damage;
        private GameObject _owner;
        private float _expiresAt;

        public static void Spawn(Vector3 position, Vector3 direction, float speed, int damage, GameObject owner)
        {
            GameObject projectileObject = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            projectileObject.name = "Energy Projectile";
            projectileObject.transform.position = position;
            projectileObject.transform.localScale = new Vector3(0.38f, 0.16f, 0.16f);
            Destroy(projectileObject.GetComponent<Collider>());

            Renderer renderer = projectileObject.GetComponent<Renderer>();
            Material material = new Material(Shader.Find("Standard"));
            material.color = new Color(0.3f, 0.95f, 1f);
            material.EnableKeyword("_EMISSION");
            material.SetColor("_EmissionColor", material.color * 3f);
            renderer.material = material;

            TrailRenderer trail = projectileObject.AddComponent<TrailRenderer>();
            trail.time = 0.18f;
            trail.startWidth = 0.16f;
            trail.endWidth = 0f;
            trail.material = material;
            trail.startColor = material.color;
            trail.endColor = new Color(material.color.r, material.color.g, material.color.b, 0f);

            Projectile projectile = projectileObject.AddComponent<Projectile>();
            projectile._velocity = direction.normalized * speed;
            projectile._damage = damage;
            projectile._owner = owner;
            projectile._expiresAt = Time.time + 3f;
        }

        private void Update()
        {
            float distance = _velocity.magnitude * Time.deltaTime;
            if (Physics.SphereCast(transform.position, 0.09f, _velocity.normalized, out RaycastHit hit, distance, ~0, QueryTriggerInteraction.Ignore))
            {
                if (hit.collider.gameObject != _owner)
                {
                    IDamageable damageable = hit.collider.GetComponent<IDamageable>();
                    damageable?.TakeDamage(_damage, hit.point, _velocity.normalized);
                    ImpactVfx.Spawn(hit.point, new Color(0.3f, 0.9f, 1f), 18);
                    Destroy(gameObject);
                    return;
                }
            }

            transform.position += _velocity * Time.deltaTime;
            transform.position = new Vector3(transform.position.x, transform.position.y, 0f);

            if (Time.time >= _expiresAt)
            {
                Destroy(gameObject);
            }
        }
    }
}
