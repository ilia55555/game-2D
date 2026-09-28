using System;
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
        float life = 3.2f, splash, freeze;
        int pierce;
        bool spent;
        Color color;
        readonly HashSet<Component> struck = new();
        public void Initialize()
        {
            var spec = WeaponCatalog.ForProjectile(Family);
            color = spec?.Color ?? (Family switch {
                "boss_rock" => new Color(.65f,.5f,.3f), "boss_poison" => new Color(.55f,1,.15f),
                "boss_feather" => new Color(.85f,.9f,1), "boss_ice" => new Color(.3f,.85f,1),
                "vexar_bolt" => new Color(1,.12f,.3f), _ => Friendly ? new Color(.6f,1,.8f) : new Color(1,.4f,.15f) });
            splash = spec?.Splash ?? (Family == "player_nova" ? 1.15f : 0);
            freeze = spec?.Freeze ?? 0;
            pierce = Family == "player_laser" ? 3 : 0;
            var slot = World.Models ? World.Models.Find(Family) : null;
            if (slot != null && slot.prefab)
            {
                var art = Instantiate(slot.prefab, transform); art.transform.localPosition = slot.position;
                art.transform.localEulerAngles = slot.rotation; art.transform.localScale = slot.scale;
                ModelCatalog.MakeVisualOnly(art);
            }
            else Geometry.Primitive("Energy",PrimitiveType.Sphere,transform,Vector3.zero,Vector3.one*(splash > 0 ? .14f : .085f),color);
            if (Velocity.sqrMagnitude > 0) transform.right = Velocity.normalized;
            var trail = gameObject.AddComponent<TrailRenderer>(); trail.time = pierce > 0 ? .08f : .13f;
            trail.startWidth = .055f; trail.endWidth = 0; trail.sharedMaterial = Geometry.Material(color); trail.minVertexDistance = .025f;
        }
        void Update()
        {
            if (spent || !World || !World.Running) return;
            life -= Time.deltaTime;
            if (life <= 0) { Detonate(transform.position); return; }
            Vector3 start = transform.position, delta = Velocity * Time.deltaTime;
            int mask = Layers.TerrainMask | (1 << (Friendly ? Layers.Enemy : Layers.Player));
            var overlaps = Physics.OverlapSphere(start,.025f,mask,QueryTriggerInteraction.Ignore);
            // A solid wall takes precedence over an actor overlapping the muzzle.
            Array.Sort(overlaps,(a,b) => (a.gameObject.layer == Layers.World ? 0 : 1).CompareTo(b.gameObject.layer == Layers.World ? 0 : 1));
            foreach (var c in overlaps) if (Impact(c,start)) return;
            if (delta.sqrMagnitude > .0000001f)
            {
                var hits = Physics.SphereCastAll(start,.025f,delta.normalized,delta.magnitude,mask,QueryTriggerInteraction.Ignore);
                Array.Sort(hits,(a,b) => a.distance.CompareTo(b.distance));
                foreach (var hit in hits) if (Impact(hit.collider,hit.point)) return;
            }
            transform.position = start + delta;
        }
        bool Impact(Collider target, Vector3 position)
        {
            if (spent || !target) return spent;
            var enemy = target.GetComponentInParent<EnemyActor>(); var boss = target.GetComponentInParent<BossActor>();
            Component actor = enemy ? (Component)enemy : boss;
            if (actor && struck.Contains(actor)) return false;
            if (Friendly)
            {
                if (actor) struck.Add(actor);
                if (enemy) { enemy.Hit(Damage); if (freeze > 0) enemy.Freeze(freeze); }
                if (boss) { boss.Hit(Damage); if (freeze > 0) boss.Slow(freeze); }
            }
            else
            {
                var player = target.GetComponentInParent<PlayerMotor>();
                if (player) player.Damage(Damage,position - Velocity*.05f);
            }
            if (Friendly && actor && pierce-- > 0)
            { World.Effect(position,color,.16f); return false; }
            Detonate(position); return true;
        }
        void Detonate(Vector3 position)
        {
            if (spent) return; spent = true; transform.position = position;
            if (Friendly && splash > 0)
            {
                foreach (var c in Physics.OverlapSphere(position,splash,1 << Layers.Enemy,QueryTriggerInteraction.Ignore))
                {
                    var e = c.GetComponentInParent<EnemyActor>(); var b = c.GetComponentInParent<BossActor>();
                    Component actor = e ? (Component)e : b;
                    if (!actor || !struck.Add(actor)) continue;
                    // Splash cannot hit through a solid platform/wall.
                    if (Physics.Linecast(position,c.bounds.center,Layers.TerrainMask,QueryTriggerInteraction.Ignore)) continue;
                    if (e) e.Hit(Mathf.Max(1,Damage/2)); if (b) b.Hit(Mathf.Max(1,Damage/2));
                }
                if (World.Camera) World.Camera.Shake(.045f);
            }
            World.Effect(position,color,splash > 0 ? splash*.65f : .14f); Destroy(gameObject);
        }
    }
}
