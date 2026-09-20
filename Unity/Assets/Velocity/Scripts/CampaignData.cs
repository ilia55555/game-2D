using System;
using UnityEngine;
namespace Velocity
{
    [Serializable] public class Row { public float[] values; }
    [Serializable] public class EnemySpec { public float x, y; public string kind; }
    [Serializable] public class SignSpec { public float x; public string text; }
    [Serializable] public class StageData
    {
        public int index;
        public string title, subtitle, bossName, bossArt, accent;
        public float length, arena;
        public Row[] floors, platforms, moving, crumble, spikes, lasers, springs, relics, checkpoints, gems;
        public EnemySpec[] enemies;
        public SignSpec[] signs;
        public Color Accent { get { ColorUtility.TryParseHtmlString(accent, out var c); return c; } }
    }
    [Serializable] public class CampaignData
    {
        public int version; public float pixelsPerUnit; public StageData[] stages;
        public static CampaignData Load()
        {
            var source = Resources.Load<TextAsset>("Velocity/campaign");
            if (!source) throw new InvalidOperationException("Missing Velocity/campaign.json");
            var data = JsonUtility.FromJson<CampaignData>(source.text);
            if (data?.stages == null || data.stages.Length != 5 || data.pixelsPerUnit != 100)
                throw new InvalidOperationException("Invalid campaign data");
            return data;
        }
        // Godot pixels: +Y down. Unity metres: +Y up. Ground at y = 0.
        public static Vector3 Point(float x, float y) => new Vector3(x / 100f, (620 - y) / 100f, 0);
    }
    public static class Layers
    {
        public const int World = 8, Player = 9, Enemy = 10, Decoration = 11;
        public const int TerrainMask = 1 << World;
        public static void Configure()
        {
            // Actors overlap each other; combat is explicit, scenery cannot push actors off the lane.
            Physics.IgnoreLayerCollision(Player, Enemy);
            Physics.IgnoreLayerCollision(Enemy, Enemy);
            Physics.IgnoreLayerCollision(Player, Decoration);
            Physics.IgnoreLayerCollision(Enemy, Decoration);
        }
    }
}
