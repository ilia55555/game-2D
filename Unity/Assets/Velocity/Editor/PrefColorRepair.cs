#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEditor;
using UnityEngine;

namespace Velocity.EditorTools
{
    /// <summary>
    /// Repairs malformed Unity editor color preferences without wiping unrelated EditorPrefs.
    /// Unity 6 can repeatedly log "Parsing PrefColor failed" when a saved SceneView/Overlay
    /// color preference becomes corrupted or incompatible after an editor upgrade/import.
    ///
    /// The repair discovers UnityEditor.PrefColor instances through reflection, extracts only
    /// their preference key/name fields, and removes those keys from EditorPrefs so Unity can
    /// recreate them from its built-in defaults.
    /// </summary>
    [InitializeOnLoad]
    internal static class PrefColorRepair
    {
        private const string SessionGuard = "Velocity.PrefColorRepair.RanThisSession.v1";

        static PrefColorRepair()
        {
            // Delay until editor assemblies and static preference containers are initialized.
            EditorApplication.delayCall += AutoRepairOncePerSession;
        }

        private static void AutoRepairOncePerSession()
        {
            if (SessionState.GetBool(SessionGuard, false))
                return;

            SessionState.SetBool(SessionGuard, true);

            int removed = ResetUnityPrefColors(logWhenClean: false);
            if (removed > 0)
            {
                Debug.Log($"[Velocity] Repaired {removed} Unity PrefColor preference(s). " +
                          "SceneView/Overlay colors were restored to Unity defaults.");
                InternalRepaintAllViews();
            }
        }

        [MenuItem("Tools/Project Repair/Reset Unity PrefColor Preferences", priority = 2000)]
        private static void ManualRepair()
        {
            int removed = ResetUnityPrefColors(logWhenClean: true);
            SessionState.SetBool(SessionGuard, true);

            EditorUtility.DisplayDialog(
                "PrefColor Repair",
                removed > 0
                    ? $"Removed {removed} saved Unity color preference(s).\n\n" +
                      "The Scene view and Overlay colors will use Unity defaults. " +
                      "If the Console already contains old PrefColor errors, clear it once."
                    : "No saved Unity PrefColor keys were found. Nothing else was changed.",
                "OK");

            InternalRepaintAllViews();
        }

        private static int ResetUnityPrefColors(bool logWhenClean)
        {
            Type prefColorType = FindType("UnityEditor.PrefColor");
            if (prefColorType == null)
            {
                if (logWhenClean)
                    Debug.Log("[Velocity] UnityEditor.PrefColor type was not found; no editor preferences were changed.");
                return 0;
            }

            var keys = new HashSet<string>(StringComparer.Ordinal);
            var assemblies = AppDomain.CurrentDomain.GetAssemblies();

            foreach (Assembly assembly in assemblies)
            {
                string assemblyName = assembly.GetName().Name ?? string.Empty;
                if (!assemblyName.StartsWith("UnityEditor", StringComparison.Ordinal))
                    continue;

                foreach (Type type in SafeGetTypes(assembly))
                {
                    if (type == null)
                        continue;

                    FieldInfo[] fields;
                    try
                    {
                        fields = type.GetFields(BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
                    }
                    catch
                    {
                        continue;
                    }

                    foreach (FieldInfo field in fields)
                    {
                        if (field == null || field.FieldType != prefColorType)
                            continue;

                        object prefColor;
                        try
                        {
                            prefColor = field.GetValue(null);
                        }
                        catch
                        {
                            continue;
                        }

                        if (prefColor == null)
                            continue;

                        CollectPreferenceKeys(prefColorType, prefColor, keys);
                    }
                }
            }

            int removed = 0;
            foreach (string key in keys)
            {
                if (string.IsNullOrWhiteSpace(key))
                    continue;

                try
                {
                    if (!EditorPrefs.HasKey(key))
                        continue;

                    EditorPrefs.DeleteKey(key);
                    removed++;
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[Velocity] Could not reset Unity color preference '{key}': {ex.Message}");
                }
            }

            if (logWhenClean && removed == 0)
                Debug.Log("[Velocity] PrefColor repair completed; no matching saved color keys needed removal.");

            return removed;
        }

        private static void CollectPreferenceKeys(Type prefColorType, object instance, HashSet<string> keys)
        {
            const BindingFlags flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;

            foreach (FieldInfo field in prefColorType.GetFields(flags))
            {
                if (field.FieldType != typeof(string) || !LooksLikeKeyMember(field.Name))
                    continue;

                try
                {
                    if (field.GetValue(instance) is string value && LooksLikePreferenceKey(value))
                        keys.Add(value);
                }
                catch
                {
                    // Ignore Unity internals that are not readable in this editor version.
                }
            }

            foreach (PropertyInfo property in prefColorType.GetProperties(flags))
            {
                if (property.PropertyType != typeof(string) || !property.CanRead ||
                    property.GetIndexParameters().Length != 0 || !LooksLikeKeyMember(property.Name))
                    continue;

                try
                {
                    if (property.GetValue(instance) is string value && LooksLikePreferenceKey(value))
                        keys.Add(value);
                }
                catch
                {
                    // Ignore Unity internals that are not readable in this editor version.
                }
            }
        }

        private static bool LooksLikeKeyMember(string memberName)
        {
            if (string.IsNullOrEmpty(memberName))
                return false;

            string n = memberName.ToLowerInvariant();
            return n.Contains("name") || n.Contains("key") || n.Contains("pref");
        }

        private static bool LooksLikePreferenceKey(string value)
        {
            if (string.IsNullOrWhiteSpace(value) || value.Length > 256)
                return false;

            // Preference names are short identifiers/paths, not serialized color payloads.
            return value.IndexOf('\n') < 0 && value.IndexOf('\r') < 0;
        }

        private static Type FindType(string fullName)
        {
            foreach (Assembly assembly in AppDomain.CurrentDomain.GetAssemblies())
            {
                Type type = assembly.GetType(fullName, throwOnError: false);
                if (type != null)
                    return type;
            }
            return null;
        }

        private static IEnumerable<Type> SafeGetTypes(Assembly assembly)
        {
            try
            {
                return assembly.GetTypes();
            }
            catch (ReflectionTypeLoadException ex)
            {
                return ex.Types ?? Array.Empty<Type>();
            }
            catch
            {
                return Array.Empty<Type>();
            }
        }

        private static void InternalRepaintAllViews()
        {
            try
            {
                UnityEditorInternal.InternalEditorUtility.RepaintAllViews();
            }
            catch
            {
                // Repaint is best-effort only; the preference repair itself already completed.
            }
        }
    }
}
#endif
