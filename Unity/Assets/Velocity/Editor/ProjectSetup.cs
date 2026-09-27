using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
namespace Velocity.Editor
{
    [InitializeOnLoad]
    public static class ProjectSetup
    {
        const string ScenePath="Assets/Velocity/Scenes/Main.unity";
        static ProjectSetup()
        {
            EditorApplication.delayCall+=()=>
            {
                if(Application.isBatchMode || EditorApplication.isPlayingOrWillChangePlaymode) return;
                var scene=SceneManager.GetActiveScene();
                if(!SessionState.GetBool("AERO.Opened",false) && string.IsNullOrEmpty(scene.path) && !scene.isDirty && File.Exists(ScenePath))
                { SessionState.SetBool("AERO.Opened",true); EditorSceneManager.OpenScene(ScenePath); }
            };
        }
        [MenuItem("AERO/Open Game")]
        [MenuItem("Velocity/Open Game")]
        public static void Open()
        { if(EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) EditorSceneManager.OpenScene(ScenePath); }
        [MenuItem("Velocity/Select 3D Model Catalog")]
        public static void SelectModels()
        {
            var catalog=AssetDatabase.LoadAssetAtPath<ModelCatalog>("Assets/Velocity/Resources/Velocity/Models.asset");
            Selection.activeObject=catalog; EditorGUIUtility.PingObject(catalog);
        }
        [MenuItem("AERO/Validate Project")]
        [MenuItem("Velocity/Validate Project")]
        public static void Validate()
        {
            var campaign=CampaignData.Load(); var catalog=Resources.Load<ModelCatalog>("Velocity/Models");
            if(!catalog) throw new Exception("Model catalog is missing");
            for(int i=0;i<campaign.stages.Length;i++)
            {
                var stage=campaign.stages[i]; var slot=catalog.Find("layout_"+i);
                if(slot!=null && slot.prefab)
                {
                    var layout=slot.prefab.GetComponent<StageLayout>();
                    if(!layout) throw new Exception("layout_"+i+" requires StageLayout");
                    stage=layout.Export(stage);
                }
                if(stage.checkpoints.Length<3 || stage.relics.Length!=3 || stage.enemies.Length==0) throw new Exception("Invalid content in stage "+i);
                foreach(var checkpoint in stage.checkpoints)
                {
                    var p=checkpoint.values;
                    if(!Array.Exists(stage.floors,r=>r.values[0]<=p[0] && p[0]+70<r.values[0]+r.values[2] && Mathf.Abs(p[1]-r.values[1])<1))
                        throw new Exception("Unsafe checkpoint in stage "+(i+1));
                }
            }
            if(!File.Exists(ScenePath)) throw new FileNotFoundException(ScenePath);
            int assigned=0; foreach(var slot in catalog.models) if(slot!=null && slot.prefab) assigned++;
            foreach(var track in new[]{"menu","boss","stage_0","stage_1","stage_2","stage_3","stage_4"})
                if(!Resources.Load<AudioClip>("Velocity/Audio/music/"+track)) throw new FileNotFoundException("Missing audio: "+track);
            Debug.Log("AERO: six stages validated; "+assigned+" art slots assigned. Empty slots use blockouts. Run Test Runner and a playthrough before release.");
        }
        [MenuItem("AERO/Build Windows")]
        [MenuItem("Velocity/Build Windows")]
        public static void BuildWindows() => Build(BuildTarget.StandaloneWindows64,"Builds/Windows/AERO.exe");
        [MenuItem("AERO/Build Linux")]
        public static void BuildLinux() => Build(BuildTarget.StandaloneLinux64,"Builds/Linux/AERO");
        static void Build(BuildTarget target,string destination)
        {
            Validate(); Directory.CreateDirectory(Path.GetDirectoryName(destination));
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{ScenePath},locationPathName=destination,target=target,options=BuildOptions.None});
            if(report.summary.result!=BuildResult.Succeeded) throw new Exception("Build failed: "+report.summary.result);
        }
    }
}
