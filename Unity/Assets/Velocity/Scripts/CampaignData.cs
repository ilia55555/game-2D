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
        public string biome, finalBossName, finalBossArt, music;
        public int bossHealth = 80;
        public float friction = 1;
        public float length, arena;
        public Vector3 spawn = new Vector3(1.7f,.02f,0);
        public Vector3 bossSpawn;
        public bool customBossSpawn;
        public Row[] floors, platforms, moving, crumble, spikes, lasers, springs, relics, checkpoints, gems;
        public EnemySpec[] enemies;
        public SignSpec[] signs;
        public Color Accent { get { ColorUtility.TryParseHtmlString(accent, out var c); return c; } }
    }
    [Serializable] public class CampaignData
    {
        public const int StageCount = 6;
        public int version; public float pixelsPerUnit; public StageData[] stages;
        public static CampaignData Load()
        {
            var source = Resources.Load<TextAsset>("Velocity/campaign");
            if (!source) throw new InvalidOperationException("Missing Velocity/campaign.json");
            var data = JsonUtility.FromJson<CampaignData>(source.text);
            if (data?.stages == null || data.version != 2 || data.stages.Length != StageCount || data.pixelsPerUnit != 100)
                throw new InvalidOperationException("Invalid campaign data");
            for (int i = 0; i < data.stages.Length; i++)
            {
                var stage = data.stages[i];
                if (stage.index != i || stage.length <= stage.arena || stage.floors == null ||
                    stage.checkpoints?.Length != 3 || stage.relics?.Length != 3 || string.IsNullOrEmpty(stage.bossArt))
                    throw new InvalidOperationException("Invalid stage " + i);
            }
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
