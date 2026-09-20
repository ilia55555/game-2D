using System.Collections.Generic;
using UnityEngine;
namespace Velocity
{
    public class Projectile : MonoBehaviour
    {
        public WorldSession World;
        public Vector3 Velocity;
        public bool Friendly;
        public int Damage;
        public string Family;
        float life = 2.5f;
        bool spent;
        public void Initialize()
        {
            var c = Friendly ? (Family == "player_nova" ? new Color(.7f,.5f,1) : new Color(.55f,1,.8f)) : new Color(1,.45f,.2f);
            var slot = World.Models ? World.Models.Find(Family) : null;
            if (slot != null && slot.prefab)
            {
                var visual = Instantiate(slot.prefab, transform); visual.transform.localPosition = slot.position;
                visual.transform.localEulerAngles = slot.rotation; visual.transform.localScale = slot.scale;
                foreach (var collider in visual.GetComponentsInChildren<Collider>()) collider.enabled = false;
                foreach (var rb in visual.GetComponentsInChildren<Rigidbody>()) { rb.isKinematic = true; rb.detectCollisions = false; }
            }
            else Geometry.Primitive("Energy", PrimitiveType.Sphere, transform, Vector3.zero, Vector3.one * (Family == "player_nova" ? .14f : .09f), c);
            transform.right = Velocity.normalized;
            var trail = gameObject.AddComponent<TrailRenderer>(); trail.time = .1f; trail.startWidth = .06f; trail.endWidth = 0;
            trail.sharedMaterial = Geometry.Material(c); trail.minVertexDistance = .025f;
        }
        void Update()
        {
            if (spent || !World.Running) return;
            life -= Time.deltaTime; if (life <= 0) { Destroy(gameObject); return; }
            Vector3 delta = Velocity * Time.deltaTime;
            int mask = Layers.TerrainMask | (1 << (Friendly ? Layers.Enemy : Layers.Player));
            // Include overlaps at the origin: sphere casts alone ignore colliders containing the origin.
            var overlaps = Physics.OverlapSphere(transform.position, .025f, mask, QueryTriggerInteraction.Ignore);
            if (overlaps.Length > 0) { Impact(overlaps[0], transform.position); return; }
            if (Physics.SphereCast(transform.position, .025f, delta.normalized, out var hit, delta.magnitude, mask, QueryTriggerInteraction.Ignore))
                Impact(hit.collider, hit.point);
            else transform.position += delta;
        }
        void Impact(Collider target, Vector3 position)
        {
            if (spent) return; spent = true; transform.position = position;
            var enemy = target.GetComponentInParent<EnemyActor>(); var boss = target.GetComponentInParent<BossActor>();
            if (Friendly) { if (enemy) enemy.Hit(Damage); if (boss) boss.Hit(Damage); }
            else { var player = target.GetComponentInParent<PlayerMotor>(); if (player) player.Damage(Damage, position - Velocity * .05f); }
            if (Friendly && Family == "player_nova")
            {
                var seen = new HashSet<Component>(); if (enemy) seen.Add(enemy); if (boss) seen.Add(boss);
                foreach (var c in Physics.OverlapSphere(position, 1.15f, 1 << Layers.Enemy))
                {
                    var e = c.GetComponentInParent<EnemyActor>(); var b = c.GetComponentInParent<BossActor>();
                    if (e && seen.Add(e)) e.Hit(2); if (b && seen.Add(b)) b.Hit(2);
                }
                World.Camera.Shake(.04f);
            }
            World.Effect(position, Friendly ? World.Data.Accent : new Color(1,.5f,.2f), Family == "player_nova" ? .45f : .14f);
            Destroy(gameObject);
        }
    }
}
