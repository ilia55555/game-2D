using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;
namespace Velocity.Editor
{
    public class AeroArtSetup : EditorWindow
    {
        ModelCatalog catalog;
        Vector2 scroll;
        int category;
        string expanded;
        static readonly string[] Categories={"Actors","Weapons","Projectiles","World"};
        public static readonly string[] RequiredIds={
            "hero","mushroom","bee","scorpion","vulture","wolf","drone","ice_wolf","ice_drone","fire_imp","fire_bat","robot","turret",
            "boss_gorilla","boss_scorpion","boss_eagle","boss_bear","boss_lion","boss_rhino","vexar_feral","vexar_armored","vexar_final",
            "weapon_blaster","weapon_scatter","weapon_laser","weapon_rocket","weapon_ice","weapon_plasma",
            "player_pulse","player_scatter","player_laser","player_rocket","player_ice","player_plasma",
            "enemy_bolt","boss_rock","boss_poison","boss_feather","boss_ice","boss_fire","boss_bolt","vexar_bolt",
            "environment_0","environment_1","environment_2","environment_3","environment_4","environment_5",
            "layout_0","layout_1","layout_2","layout_3","layout_4","layout_5",
            "terrain_floor","terrain_platform","terrain_moving","terrain_crumble","terrain_arena",
            "item_gem","item_relic","item_heal","item_spike","item_spring","item_checkpoint","item_portal"
        };
        [MenuItem("AERO/Art Setup")]
        public static void ShowWindow() { GetWindow<AeroArtSetup>("AERO Art Setup").minSize=new Vector2(480,500); }
        void OnEnable() { catalog=Resources.Load<ModelCatalog>("Velocity/Models"); }
        static int Category(string id) => id.StartsWith("weapon_")?1:id.StartsWith("player_")||id.EndsWith("_bolt")||
            new[]{"boss_rock","boss_poison","boss_feather","boss_ice","boss_fire"}.Contains(id)?2:id.StartsWith("environment_")||id.StartsWith("layout_")||id.StartsWith("terrain_")||id.StartsWith("item_")?3:0;
        public static void EnsureSlots(ModelCatalog target)
        {
            if(!target) return;
            var list=new List<ModelSlot>(target.models??Array.Empty<ModelSlot>());
            foreach(var id in RequiredIds) if(!list.Any(s=>s!=null && s.id==id)) list.Add(new ModelSlot{id=id});
            if(list.Count!=(target.models?.Length??0)) { Undo.RecordObject(target,"Add AERO slots"); target.models=list.ToArray(); EditorUtility.SetDirty(target); }
        }
        void OnGUI()
        {
            EditorGUILayout.LabelField("AERO / BLENDER ART",EditorStyles.boldLabel);
            EditorGUILayout.HelpBox("Drop an FBX or prefab into its slot. Gameplay stays on X/Y at Z=0. Face local +X; use Generic, in-place animation. Empty slots use the playable blockout.",MessageType.Info);
            catalog=(ModelCatalog)EditorGUILayout.ObjectField("Catalog",catalog,typeof(ModelCatalog),false);
            if(!catalog) return;
            if(GUILayout.Button("Add missing AERO slots")) EnsureSlots(catalog);
            category=GUILayout.Toolbar(category,Categories);
            scroll=EditorGUILayout.BeginScrollView(scroll);
            foreach(var slot in catalog.models)
            {
                if(slot==null || !RequiredIds.Contains(slot.id) || Category(slot.id)!=category) continue;
                EditorGUILayout.BeginVertical(EditorStyles.helpBox);
                EditorGUI.BeginChangeCheck();
                var prefab=(GameObject)EditorGUILayout.ObjectField(slot.id,slot.prefab,typeof(GameObject),false);
                if(EditorGUI.EndChangeCheck()) { Undo.RecordObject(catalog,"Assign AERO model"); slot.prefab=prefab; EditorUtility.SetDirty(catalog); }
                bool open=EditorGUILayout.Foldout(expanded==slot.id,"Transform / animation",true);
                if(open)
                {
                    expanded=slot.id;
                    EditorGUI.BeginChangeCheck();
                    var position=EditorGUILayout.Vector3Field("Offset (metres)",slot.position);
                    var rotation=EditorGUILayout.Vector3Field("Rotation",slot.rotation);
                    var scale=EditorGUILayout.Vector3Field("Scale",slot.scale);
                    var controller=(RuntimeAnimatorController)EditorGUILayout.ObjectField("Animator controller",slot.controller,typeof(RuntimeAnimatorController),false);
                    bool hide=slot.id.StartsWith("environment_")?EditorGUILayout.Toggle("Hide blockout static terrain",slot.hideStaticTerrain):slot.hideStaticTerrain;
                    if(slot.id.StartsWith("terrain_")) EditorGUILayout.HelpBox("Use a centred 1 x 1 x 1 metre mesh. The gameplay slab scales this visual to its width, height and depth; moving/crumbling motion stays attached.",MessageType.None);
                    if(EditorGUI.EndChangeCheck())
                    {
                        Undo.RecordObject(catalog,"Adjust AERO model"); slot.position=position; slot.rotation=rotation; slot.scale=scale; slot.controller=controller; slot.hideStaticTerrain=hide; EditorUtility.SetDirty(catalog);
                    }
                    if(category==0 && slot.prefab)
                    {
                        EditorGUILayout.BeginHorizontal();
                        if(GUILayout.Button("Fit gameplay height")) Fit(slot);
                        if(GUILayout.Button("Build Animator from FBX clips"))
                        {
                            var clips=CollectClips(slot.prefab);
                            if(clips.Length==0) EditorUtility.DisplayDialog("No clips found","Enable Import Animation on the FBX, or assign your own Animator Controller above.","OK");
                            else
                            {
                                Undo.RecordObject(catalog,"Build AERO animator"); slot.controller=CreateController(slot.id,clips); EditorUtility.SetDirty(catalog);
                            }
                        }
                        EditorGUILayout.EndHorizontal();
                    }
                }
                else if(expanded==slot.id) expanded=null;
                EditorGUILayout.EndVertical();
            }
            EditorGUILayout.EndScrollView();
            if(GUILayout.Button("Save catalog")) AssetDatabase.SaveAssets();
        }
        void Fit(ModelSlot slot)
        {
            var sample=Instantiate(slot.prefab); sample.hideFlags=HideFlags.HideAndDontSave;
            try
            {
                sample.transform.position=Vector3.zero; sample.transform.rotation=Quaternion.Euler(slot.rotation); sample.transform.localScale=Vector3.one;
                var renderers=sample.GetComponentsInChildren<Renderer>(); if(renderers.Length==0) return;
                var bounds=renderers[0].bounds; foreach(var r in renderers) bounds.Encapsulate(r.bounds);
                if(bounds.size.y<.001f) return;
                float height=slot.id=="hero"?.95f:slot.id.StartsWith("boss_")||slot.id.StartsWith("vexar_")?2.3f:.9f;
                float factor=height/bounds.size.y;
                Undo.RecordObject(catalog,"Fit AERO model"); slot.scale=Vector3.one*factor;
                slot.position=new Vector3(-bounds.center.x,-bounds.min.y,-bounds.center.z)*factor; EditorUtility.SetDirty(catalog);
            }
            finally { DestroyImmediate(sample); }
        }
        static AnimationClip[] CollectClips(GameObject prefab)
        {
            var paths=new HashSet<string>{AssetDatabase.GetAssetPath(prefab)};
            foreach(var t in prefab.GetComponentsInChildren<Transform>(true))
            {
                var original=PrefabUtility.GetCorrespondingObjectFromOriginalSource(t.gameObject);
                if(original) paths.Add(AssetDatabase.GetAssetPath(original));
            }
            return paths.Where(p=>!string.IsNullOrEmpty(p)).SelectMany(AssetDatabase.LoadAllAssetsAtPath)
                .OfType<AnimationClip>().Where(c=>!c.name.StartsWith("__preview__")).Distinct().ToArray();
        }
        public static AnimatorController CreateController(string id,AnimationClip[] clips)
        {
            const string folder="Assets/Velocity/GeneratedAnimations";
            if(!AssetDatabase.IsValidFolder(folder)) AssetDatabase.CreateFolder("Assets/Velocity","GeneratedAnimations");
            string path=AssetDatabase.GenerateUniqueAssetPath(folder+"/"+id+".controller");
            var controller=AnimatorController.CreateAnimatorControllerAtPath(path);
            foreach(var name in new[]{"Speed","VerticalSpeed","Charge","Weapon"}) controller.AddParameter(name,AnimatorControllerParameterType.Float);
            foreach(var name in new[]{"Grounded","Crouching","Dashing","Charging","Shielded","Dead"}) controller.AddParameter(name,AnimatorControllerParameterType.Bool);
            foreach(var name in new[]{"Jump","Fire","Hurt","Death","Telegraph","Attack","Slam","Special","Transform"}) controller.AddParameter(name,AnimatorControllerParameterType.Trigger);
            AnimationClip Clip(params string[] aliases) => clips.FirstOrDefault(c=>aliases.Any(a=>
            {
                string clipName=c.name.Split('|').Last().ToLowerInvariant().Replace(' ','_');
                string key=a.ToLowerInvariant();
                return clipName==key || clipName.StartsWith(key+"_") || clipName.EndsWith("_"+key);
            }));
            var machine=controller.layers[0].stateMachine;
            var idle=Clip("idle","stand")??clips[0];
            var names=new[]{"Idle","Run","Rise","Fall","Crouch","Dash"};
            var motions=new[]{idle,Clip("run","walk")??idle,Clip("jump","rise")??idle,Clip("fall")??idle,Clip("crouch","duck")??idle,Clip("dash")??idle};
            var states=new AnimatorState[names.Length];
            for(int i=0;i<names.Length;i++) { states[i]=machine.AddState(names[i],new Vector3(240+i%3*200,80+i/3*130)); states[i].motion=motions[i]; }
            machine.defaultState=states[0];
            for(int from=0;from<states.Length;from++) for(int to=0;to<states.Length;to++)
            {
                if(from==to) continue;
                var t=states[from].AddTransition(states[to]); t.hasExitTime=false; t.duration=.08f;
                t.AddCondition(AnimatorConditionMode.IfNot,0,"Dead");
                t.AddCondition(to==5?AnimatorConditionMode.If:AnimatorConditionMode.IfNot,0,"Dashing");
                if(to==5) continue;
                t.AddCondition(to==2||to==3?AnimatorConditionMode.IfNot:AnimatorConditionMode.If,0,"Grounded");
                if(to==2||to==3) t.AddCondition(to==2?AnimatorConditionMode.Greater:AnimatorConditionMode.Less,.1f,"VerticalSpeed");
                else
                {
                    t.AddCondition(to==4?AnimatorConditionMode.If:AnimatorConditionMode.IfNot,0,"Crouching");
                    if(to==0||to==1) t.AddCondition(to==1?AnimatorConditionMode.Greater:AnimatorConditionMode.Less,.1f,"Speed");
                }
            }
            int actionIndex=0;
            foreach(var name in new[]{"Fire","Hurt","Death","Telegraph","Attack","Slam","Special","Transform"})
            {
                var clip=Clip(name,name=="Fire"?"shoot":name=="Death"?"die":name=="Hurt"?"hit":name);
                if(!clip && name!="Death") continue;
                var state=machine.AddState(name,new Vector3(240+actionIndex++%3*200,420+actionIndex/3*110)); state.motion=clip??idle;
                var enter=machine.AddAnyStateTransition(state); enter.duration=.05f; enter.hasExitTime=false; enter.canTransitionToSelf=false;
                enter.AddCondition(AnimatorConditionMode.If,0,name);
                if(name!="Death")
                {
                    enter.AddCondition(AnimatorConditionMode.IfNot,0,"Dead");
                    var end=state.AddTransition(states[0]); end.hasExitTime=true; end.exitTime=.9f; end.duration=.06f;
                }
            }
            EditorUtility.SetDirty(controller); AssetDatabase.SaveAssets();
            Debug.Log("Created "+path+". Check clip matches and loop Idle/Run on your FBX import settings.");
            return controller;
        }
    }
}
