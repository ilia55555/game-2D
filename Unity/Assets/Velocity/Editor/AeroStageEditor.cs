using System;
using UnityEditor;
using UnityEngine;
namespace Velocity.Editor
{
    public class AeroStageEditor : EditorWindow
    {
        int stage;
        [MenuItem("AERO/Stage Layout Editor")]
        public static void Open() { GetWindow<AeroStageEditor>("AERO Stage Layout"); }
        void OnGUI()
        {
            var campaign=CampaignData.Load();
            EditorGUILayout.HelpBox("Create an editable route prefab from a shipped stage. In Prefab Mode, move LevelMarker objects and edit their type/width. Gizmos show collision surfaces. The catalog loads this route on the next stage start. Keep the root scale at 1 and rotation at 0.",MessageType.Info);
            var names=Array.ConvertAll(campaign.stages,s=>(s.index+1)+". "+s.title);
            stage=EditorGUILayout.Popup("Stage",stage,names);
            var catalog=Resources.Load<ModelCatalog>("Velocity/Models");
            if(!catalog) return;
            var slot=catalog.Find("layout_"+stage);
            if(slot!=null && slot.prefab)
            {
                if(GUILayout.Button("Open current layout prefab")) AssetDatabase.OpenAsset(slot.prefab);
                if(GUILayout.Button("Validate layout")) { slot.prefab.GetComponent<StageLayout>().Export(campaign.stages[stage]); Debug.Log("AERO layout validated."); }
            }
            if(GUILayout.Button("Create new editable layout from shipped route"))
            {
                var prefab=Create(campaign.stages[stage]);
                AeroArtSetup.EnsureSlots(catalog); Undo.RecordObject(catalog,"Assign stage layout"); catalog.Find("layout_"+stage).prefab=prefab;
                EditorUtility.SetDirty(catalog); AssetDatabase.SaveAssets(); AssetDatabase.OpenAsset(prefab);
            }
            EditorGUILayout.HelpBox("Place Blender scenery in environment_0 ... environment_5 in Art Setup. Layout prefabs describe gameplay; environment prefabs supply the visible artwork. No scene is overwritten by this tool.",MessageType.None);
        }
        public static GameObject Create(StageData data)
        {
            const string folder="Assets/Velocity/Layouts";
            if(!AssetDatabase.IsValidFolder(folder)) AssetDatabase.CreateFolder("Assets/Velocity","Layouts");
            var root=new GameObject(data.title+" layout");
            try
            {
                var layout=root.AddComponent<StageLayout>(); layout.StageIndex=data.index;
                layout.Length=data.length/100; layout.ArenaStart=data.arena/100; layout.Spawn=data.spawn;
                layout.BossSpawn=CampaignData.Point(data.length-650,620);
                void Rows(Row[] rows,MarkerKind kind)
                {
                    var group=new GameObject(kind.ToString()); group.transform.SetParent(root.transform,false);
                    foreach(var row in rows)
                    {
                        var v=row.values; var go=new GameObject(kind.ToString()); go.transform.SetParent(group.transform,false); go.transform.localPosition=CampaignData.Point(v[0],v[1]);
                        var marker=go.AddComponent<LevelMarker>(); marker.Kind=kind;
                        if(kind==MarkerKind.Laser) { marker.Height=v[2]/100; marker.Phase=v[3]; }
                        else if(v.Length>2) marker.Width=v[2]/100;
                        if(kind==MarkerKind.Moving) { marker.Amplitude=new Vector2(v[3]/100,-v[4]/100); marker.Period=v[5]; }
                    }
                }
                Rows(data.floors,MarkerKind.Floor); Rows(data.platforms,MarkerKind.Platform); Rows(data.moving,MarkerKind.Moving); Rows(data.crumble,MarkerKind.Crumble);
                Rows(data.spikes,MarkerKind.Spike); Rows(data.lasers,MarkerKind.Laser); Rows(data.springs,MarkerKind.Spring); Rows(data.checkpoints,MarkerKind.Checkpoint);
                Rows(data.gems,MarkerKind.Coin); Rows(data.relics,MarkerKind.Relic);
                var enemies=new GameObject("Enemies"); enemies.transform.SetParent(root.transform,false);
                foreach(var enemy in data.enemies)
                {
                    var go=new GameObject(enemy.kind); go.transform.SetParent(enemies.transform,false); go.transform.localPosition=CampaignData.Point(enemy.x,enemy.y);
                    var marker=go.AddComponent<LevelMarker>(); marker.Kind=MarkerKind.Enemy; marker.EnemyKind=enemy.kind;
                }
                layout.Export(data);
                return PrefabUtility.SaveAsPrefabAsset(root,AssetDatabase.GenerateUniqueAssetPath(folder+"/Stage_"+(data.index+1)+".prefab"));
            }
            finally { DestroyImmediate(root); }
        }
    }
}
