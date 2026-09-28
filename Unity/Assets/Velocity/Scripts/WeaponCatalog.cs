using UnityEngine;
namespace Velocity
{
    public enum WeaponKind { Blaster, Scatter, ChargeLaser, Rocket, Ice, Plasma }

    public readonly struct WeaponSpec
    {
        public readonly string Name, Projectile, Model;
        public readonly int Cost, Damage, Pellets;
        public readonly float Interval, Speed, Splash, Freeze;
        public readonly Color Color;
        public WeaponSpec(string name, string projectile, string model, int cost, int damage,
            int pellets, float interval, float speed, Color color, float splash = 0, float freeze = 0)
        { Name=name; Projectile=projectile; Model=model; Cost=cost; Damage=damage; Pellets=pellets;
            Interval=interval; Speed=speed; Color=color; Splash=splash; Freeze=freeze; }
    }

    public static class WeaponCatalog
    {
        public const int Count = 6;
        public const float ChargeSeconds = 1.15f;
        static readonly WeaponSpec[] Weapons = {
            new WeaponSpec("BLASTER", "player_pulse", "weapon_blaster", 0, 2, 1, .16f, 13, new Color(.3f,.85f,1)),
            new WeaponSpec("SCATTER", "player_scatter", "weapon_scatter", 9, 2, 5, .45f, 11, new Color(1,.65f,.2f)),
            new WeaponSpec("CHARGE LASER", "player_laser", "weapon_laser", 18, 13, 1, .35f, 45, new Color(.4f,1,.15f)),
            new WeaponSpec("ROCKET", "player_rocket", "weapon_rocket", 20, 9, 1, .7f, 9, new Color(1,.35f,.12f), 1.4f),
            new WeaponSpec("ICE", "player_ice", "weapon_ice", 8, 2, 1, .3f, 12, new Color(.6f,.95f,1), 0, 2.2f),
            new WeaponSpec("PLASMA", "player_plasma", "weapon_plasma", 12, 5, 1, .28f, 10, new Color(.85f,.35f,1), .65f)
        };
        public static WeaponSpec Get(int index) => Weapons[Mathf.Clamp(index, 0, Count - 1)];
        public static int Resolve(int index, float energy) => energy >= Get(index).Cost ? Mathf.Clamp(index,0,Count-1) : 0;
        public static WeaponSpec? ForProjectile(string id)
        {
            foreach (var spec in Weapons) if (spec.Projectile == id) return spec;
            return null;
        }
    }
}
