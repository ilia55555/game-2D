using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
namespace Velocity.Editor
{
    public static class ProjectSetup
    {
        const string ScenePath="Assets/Velocity/Scenes/Main.unity";
        [MenuItem("Velocity/Open Game")]
        public static void Open() { EditorSceneManager.OpenScene(ScenePath); }
        [MenuItem("Velocity/Select 3D Model Catalog")]
        public static void SelectModels()
        {
            var catalog=AssetDatabase.LoadAssetAtPath<ModelCatalog>("Assets/Velocity/Resources/Velocity/Models.asset");
            Selection.activeObject=catalog; EditorGUIUtility.PingObject(catalog);
        }
        [MenuItem("Velocity/Validate Project")]
        public static void Validate()
        {
            var campaign=CampaignData.Load();
            if(campaign.stages.Length!=5) throw new System.Exception("Campaign requires five stages");
            for(int i=0;i<5;i++)
            {
                var stage=campaign.stages[i];
                if(stage.checkpoints.Length!=3 || stage.relics.Length!=3 || stage.enemies.Length==0)
                    throw new System.Exception("Invalid content in stage "+i);
            }
            if(!File.Exists(ScenePath)) throw new FileNotFoundException(ScenePath);
            var catalog=Resources.Load<ModelCatalog>("Velocity/Models");
            foreach(var slot in catalog.models) if(!slot.prefab) Debug.LogWarning("3D model not supplied: "+slot.id);
            foreach(var track in new[]{"menu","boss","stage_0","stage_1","stage_2","stage_3","stage_4"})
                if(!Resources.Load<AudioClip>("Velocity/Audio/music/"+track)) throw new FileNotFoundException("Missing audio: "+track);
            Debug.Log("Campaign and asset validation passed. Run PlayMode tests and human playthrough before release.");
        }
        [MenuItem("Velocity/Build Windows")]
        public static void BuildWindows() => Build(BuildTarget.StandaloneWindows64,"Builds/Windows/Velocity.exe");
        [MenuItem("Velocity/Build Linux")]
        public static void BuildLinux() => Build(BuildTarget.StandaloneLinux64,"Builds/Linux/Velocity");
        static void Build(BuildTarget target,string destination)
        {
            Validate(); Directory.CreateDirectory(Path.GetDirectoryName(destination));
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{ScenePath},locationPathName=destination,target=target,options=BuildOptions.None});
            if(report.summary.result!=BuildResult.Succeeded) throw new System.Exception("Build failed: "+report.summary.result);
        }
    }
}
