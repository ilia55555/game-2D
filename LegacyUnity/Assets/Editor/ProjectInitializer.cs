using System.IO;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
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
            EditorApplication.delayCall += InitializeEmptyProject;
        }

        private static void InitializeEmptyProject()
        {
            if (Application.isBatchMode || EditorApplication.isPlayingOrWillChangePlaymode ||
                File.Exists("Assets/Velocity/Scenes/Main.unity")) return;
            var active = SceneManager.GetActiveScene();
            // Opening a prototype must not replace an existing or unsaved scene.
            if (string.IsNullOrEmpty(active.path) && !active.isDirty) SetupProject();
        }

        [MenuItem("Project Velocity/Setup Main Scene")]
        private static void SetupProject()
        {
            if (File.Exists("Assets/Velocity/Scenes/Main.unity"))
            {
                Debug.LogWarning("The AERO campaign is present. Use AERO > Open Game; the legacy training scene was not created.");
                return;
            }
            if (!File.Exists(MainScenePath))
            {
                if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
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
