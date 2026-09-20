#!/usr/bin/env python3
"""Generate deterministic Unity serialization identifiers and bootstrap files."""
import hashlib,pathlib,json
ROOT=pathlib.Path(__file__).resolve().parents[1]/'Unity'
def guid(path): return hashlib.md5(('velocity-unity/'+path).encode()).hexdigest()
def put(path,text):
    p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
put('Assets/Velocity/Scenes/Main.unity','''%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!1 &1000
GameObject:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  serializedVersion: 6
  m_Component:
  - component: {fileID: 1001}
  - component: {fileID: 1002}
  m_Layer: 0
  m_Name: Velocity
  m_TagString: Untagged
  m_IsActive: 1
--- !u!4 &1001
Transform:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: 1000}
  serializedVersion: 2
  m_LocalRotation: {x: 0, y: 0, z: 0, w: 1}
  m_LocalPosition: {x: 0, y: 0, z: 0}
  m_LocalScale: {x: 1, y: 1, z: 1}
  m_ConstrainProportionsScale: 0
  m_Children: []
  m_Father: {fileID: 0}
--- !u!114 &1002
MonoBehaviour:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: 1000}
  m_Enabled: 1
  m_EditorHideFlags: 0
  m_Script: {fileID: 11500000, guid: SCRIPT_GUID, type: 3}
  m_Name:
  m_EditorClassIdentifier:
  Models: {fileID: 11400000, guid: MODEL_GUID, type: 2}
'''.replace('SCRIPT_GUID',guid('Assets/Velocity/Scripts/GameApp.cs')).replace('MODEL_GUID',guid('Assets/Velocity/Resources/Velocity/Models.asset')))
ids=['hero','crawler','hopper','turret','drone','sentinel','warden','manta','oracle','titan','varkon','player_pulse','player_scatter','player_nova','enemy_bolt','boss_bolt']+['environment_'+str(i) for i in range(5)]
put('Assets/Velocity/Resources/Velocity/Models.asset','''%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!114 &11400000
MonoBehaviour:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: 0}
  m_Enabled: 1
  m_EditorHideFlags: 0
  m_Script: {fileID: 11500000, guid: SCRIPT_GUID, type: 3}
  m_Name: Models
  m_EditorClassIdentifier:
  models:
'''.replace('SCRIPT_GUID',guid('Assets/Velocity/Scripts/ModelCatalog.cs'))+''.join('  - id: '+i+'''
    prefab: {fileID: 0}
    position: {x: 0, y: 0, z: 0}
    rotation: {x: 0, y: 0, z: 0}
    scale: {x: 1, y: 1, z: 1}
''' for i in ids))
put('ProjectSettings/EditorBuildSettings.asset','''%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!1045 &1
EditorBuildSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 2
  m_Scenes:
  - enabled: 1
    path: Assets/Velocity/Scenes/Main.unity
    guid: SCENE_GUID
  m_configObjects: {}
'''.replace('SCENE_GUID',guid('Assets/Velocity/Scenes/Main.unity')))
put('ProjectSettings/ProjectSettings.asset','''%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!129 &1
PlayerSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 27
  productGUID: 87ffb7b0795b409985a570f079f9d5a3
  companyName: Ilia
  productName: Velocity Echoes of the Core
  defaultScreenWidth: 1280
  defaultScreenHeight: 720
  defaultIsNativeResolution: 1
  resizableWindow: 1
  runInBackground: 0
  fullscreenMode: 3
  activeInputHandler: 1
  m_ActiveColorSpace: 1
  bundleVersion: 0.1.0
  applicationIdentifier:
    Standalone: com.ilia.velocity
  scriptingBackend:
    Standalone: 0
  stripEngineCode: 0
''')
layers=['Default','TransparentFX','Ignore Raycast','','Water','UI','','','World','Player','Enemy','Decoration']+['']*20
put('ProjectSettings/TagManager.asset','''%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!78 &1
TagManager:
  serializedVersion: 3
  tags: []
  layers:
'''+''.join('  - '+v+'\n' for v in layers)+'''  m_SortingLayers:
  - name: Default
    uniqueID: 0
    locked: 0
  m_RenderingLayers:
  - Default
''')
# A serialized material keeps Standard included in player builds (Shader.Find alone is insufficient).
put('Assets/Velocity/Resources/Velocity/Standard.mat','''%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!21 &2100000
Material:
  serializedVersion: 8
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_Name: Standard
  m_Shader: {fileID: 46, guid: 0000000000000000f000000000000000, type: 0}
  m_ValidKeywords: []
  m_InvalidKeywords: []
  m_LightmapFlags: 4
  m_EnableInstancingVariants: 1
  m_DoubleSidedGI: 0
  m_CustomRenderQueue: -1
  stringTagMap: {}
  disabledShaderPasses: []
  m_SavedProperties:
    serializedVersion: 3
    m_TexEnvs: []
    m_Ints: []
    m_Floats:
    - _Glossiness: 0.32
    - _Metallic: 0
    m_Colors:
    - _Color: {r: 1, g: 1, b: 1, a: 1}
''')
for p in sorted((ROOT/'Assets').rglob('*')):
    if p.suffix=='.meta': continue
    # Never overwrite import settings or GUIDs of user-imported art/audio.
    if pathlib.Path(str(p)+'.meta').exists(): continue
    relative=p.relative_to(ROOT).as_posix()
    base='fileFormatVersion: 2\nguid: '+guid(relative)+'\n'
    if p.is_dir(): body='folderAsset: yes\nDefaultImporter:\n  externalObjects: {}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n'
    elif p.suffix=='.cs': body='MonoImporter:\n  externalObjects: {}\n  serializedVersion: 2\n  defaultReferences: []\n  executionOrder: 0\n  icon: {instanceID: 0}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n'
    elif p.suffix in ('.asset','.mat'): body='NativeFormatImporter:\n  externalObjects: {}\n  mainObjectFileID: '+('2100000' if p.suffix=='.mat' else '11400000')+'\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n'
    elif p.suffix=='.asmdef': body='AssemblyDefinitionImporter:\n  externalObjects: {}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n'
    elif p.suffix=='.json': body='TextScriptImporter:\n  externalObjects: {}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n'
    else: body='DefaultImporter:\n  externalObjects: {}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n'
    pathlib.Path(str(p)+'.meta').write_text(base+body)
print('Unity scene, settings, catalog and deterministic metadata written')
