using System.IO;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.SceneManagement;

namespace ProjectVelocity.Editor
{
    [InitializeOnLoad]
    public static class ProjectInitializer
    {
        private const string SceneDirectory = "Assets/Scenes";
        private const string MainScenePath = SceneDirectory + "/Main.unity";

        static ProjectInitializer()
        {
            EditorApplication.delayCall += SetupProject;
        }

        [MenuItem("Project Velocity/Setup Main Scene")]
        private static void SetupProject()
        {
            if (!File.Exists(MainScenePath))
            {
                Directory.CreateDirectory(SceneDirectory);
                Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                EditorSceneManager.SaveScene(scene, MainScenePath);
            }

            EnsureSceneIsInBuildSettings();
            AssetDatabase.SaveAssets();
        }

        private static void EnsureSceneIsInBuildSettings()
        {
            List<EditorBuildSettingsScene> scenes = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
            for (int index = 0; index < scenes.Count; index++)
            {
                if (scenes[index].path == MainScenePath)
                {
                    scenes[index] = new EditorBuildSettingsScene(MainScenePath, true);
                    EditorBuildSettings.scenes = scenes.ToArray();
                    return;
                }
            }

            scenes.Add(new EditorBuildSettingsScene(MainScenePath, true));
            EditorBuildSettings.scenes = scenes.ToArray();
        }
    }
}
