using UnityEngine;
using UnityEngine.InputSystem;
namespace Velocity
{
    public class GameApp : MonoBehaviour
    {
        public static bool SuppressSaveForTests;
        public ModelCatalog Models;
        public GameInput Input { get; private set; }
        public GameAudio Audio { get; private set; }
        public SaveStore Save { get; private set; }
        public WorldSession World { get; private set; }
        public bool Playing { get; private set; }
        public bool Paused { get; private set; }
        CampaignData campaign;
        string page="menu";
        Camera menuCamera;
        AudioListener menuListener;
        GUIStyle title, label, button;
        Vector2 scroll;
        int selected;
        void Awake()
        {
            Layers.Configure(); Application.targetFrameRate=120;
            Save=new SaveStore(null, SuppressSaveForTests); campaign=CampaignData.Load();
            if(!Models) Models=Resources.Load<ModelCatalog>("Velocity/Models");
            Input=gameObject.AddComponent<GameInput>(); Input.TouchEnabled=Save.Data.touch||Application.isMobilePlatform;
            Audio=gameObject.AddComponent<GameAudio>(); Audio.Save=Save;
            var go=new GameObject("Menu Camera"); go.transform.SetParent(transform,false);
            menuCamera=go.AddComponent<Camera>(); menuCamera.clearFlags=CameraClearFlags.SolidColor; menuCamera.backgroundColor=new Color(.025f,.04f,.07f);
            menuListener=go.AddComponent<AudioListener>();
            if(!SuppressSaveForTests) Screen.fullScreen=Save.Data.fullscreen;
            Audio.Music("menu");
        }
        void Update()
        {
            if(Playing && Input.PausePressed) { Paused=!Paused; page=Paused?"pause":"game"; Time.timeScale=Paused?0:1; }
            if(Keyboard.current?.f11Key.wasPressedThisFrame==true) { Save.Data.fullscreen=!Screen.fullScreen; Screen.fullScreen=Save.Data.fullscreen; Save.Write(); }
        }
        public void StartStage(int index)
        {
            if(index<0 || index>=5 || index>Save.Data.unlocked) return;
            if(World) { World.gameObject.SetActive(false); Destroy(World.gameObject); }
            selected=index; Time.timeScale=1; Paused=false; Playing=true; page="game"; menuCamera.enabled=false; menuListener.enabled=false;
            var go=new GameObject("Stage "+(index+1)+" - "+campaign.stages[index].title); go.transform.SetParent(transform,false);
            World=go.AddComponent<WorldSession>(); World.Initialize(this,campaign.stages[index]);
        }
        public void StageFinished() { Playing=false; page="results"; }
        public void ReturnToMenu()
        {
            Time.timeScale=1; Paused=false; Playing=false; page="menu";
            if(World) { World.gameObject.SetActive(false); Destroy(World.gameObject); World=null; }
            menuCamera.enabled=true; menuListener.enabled=true; Audio.Music("menu"); Save.Write();
        }
        void Styles()
        {
            title=new GUIStyle(GUI.skin.label){fontSize=30,fontStyle=FontStyle.Bold,wordWrap=true};
            label=new GUIStyle(GUI.skin.label){fontSize=17,wordWrap=true};
            button=new GUIStyle(GUI.skin.button){fontSize=19,fixedHeight=44};
        }
        void OnGUI()
        {
            if(title==null) Styles();
            if(page=="game")
            {
                GUI.Box(new Rect(15,15,Screen.width-30,85),"");
                GUI.Label(new Rect(30,23,Screen.width-70,30),$"{World.Data.title}   HP {World.Player.Health}/{World.Player.MaxHealth}   ENERGY {(int)World.Player.Energy}   {new[]{"PULSE","SCATTER","NOVA"}[World.Player.Weapon]}",label);
                GUI.Label(new Rect(30,54,Screen.width-70,35),$"SCORE {World.Score}   GEMS {World.Gems}   SHARDS {World.Relics}/3   {World.Banner}",label);
                if(World.BossStarted && !World.BossDefeated && World.Boss)
                {
                    var rect=new Rect(Screen.width*.25f,110,Screen.width*.5f,28);
                    GUI.Box(rect,$"{World.Data.bossName}    {World.Boss.Health} / {World.Boss.MaxHealth}");
                    GUI.color=World.Data.Accent; GUI.DrawTexture(new Rect(rect.x,rect.y+29,rect.width*World.Boss.Health/World.Boss.MaxHealth,5),Texture2D.whiteTexture); GUI.color=Color.white;
                }
                // Nearby tutorial signs are shown in the HUD, not as camera-facing world sprites.
                foreach(var sign in World.Data.signs)
                    if(Mathf.Abs(World.Player.transform.position.x-sign.x/100)<2) GUI.Label(new Rect(30,155,Screen.width-60,40),sign.text,label);
                if(GUI.Button(new Rect(Screen.width-100,Screen.height-155,80,38),"Pause")) { Paused=true; page="pause"; Time.timeScale=0; }
                if(Input.TouchEnabled)
                {
                    string[] labels={"<",">","Duck","Fire","Jump","Dash","Gun"};
                    for(int i=0;i<7;i++) GUI.Box(GameInput.TouchArea(i),labels[i]);
                }
                return;
            }
            float width=Mathf.Min(700,Screen.width-32), height=Mathf.Min(760,Screen.height-32);
            GUILayout.BeginArea(new Rect((Screen.width-width)/2,(Screen.height-height)/2,width,height),GUI.skin.box);
            scroll=GUILayout.BeginScrollView(scroll);
            GUILayout.Label("VELOCITY",title); GUILayout.Label("ECHOES OF THE CORE  /  2.5D",label); GUILayout.Space(20);
            switch(page)
            {
                case "menu":
                    if(GUILayout.Button("Continue journey",button)) StartStage(Save.Data.unlocked);
                    if(GUILayout.Button("Stage select",button)) page="stages";
                    if(GUILayout.Button("Settings",button)) page="settings";
                    GUILayout.Space(14); GUILayout.Label("Move A/D • Jump Space (twice) • Fire J / click • Dash Shift • Weapon Q / 1–3 • Duck S • Pause Esc",label);
                    GUILayout.Label("Gamepad: left stick / D-pad • A jump • X fire • B dash • RB weapon • Start pause",label);
                    break;
                case "stages":
                    for(int i=0;i<5;i++)
                    {
                        GUI.enabled=i<=Save.Data.unlocked;
                        var best=Save.Data.best[i];
                        if(GUILayout.Button($"{i+1}. {campaign.stages[i].title}"+(best!=null?$"  [{best.score}]":""),button)) StartStage(i);
                    }
                    GUI.enabled=true; if(GUILayout.Button("Back",button)) page="menu"; break;
                case "pause":
                    GUILayout.Label("PAUSED",title);
                    if(GUILayout.Button("Resume",button)) { Paused=false; Time.timeScale=1; page="game"; }
                    if(GUILayout.Button("Restart stage",button)) StartStage(selected);
                    if(GUILayout.Button("Settings",button)) page="settings";
                    if(GUILayout.Button("Main menu",button)) ReturnToMenu(); break;
                case "settings":
                    GUILayout.Label("Music",label); Save.Data.music=GUILayout.HorizontalSlider(Save.Data.music,0,1);
                    GUILayout.Label("Sound effects",label); Save.Data.sfx=GUILayout.HorizontalSlider(Save.Data.sfx,0,1);
                    Save.Data.shake=GUILayout.Toggle(Save.Data.shake,"Camera shake");
                    Save.Data.assist=GUILayout.Toggle(Save.Data.assist,"Assist mode (enemy health applies next stage / boss retry)");
                    Save.Data.touch=GUILayout.Toggle(Save.Data.touch,"Touch controls");
                    Save.Data.fullscreen=GUILayout.Toggle(Save.Data.fullscreen,"Fullscreen");
                    if(GUILayout.Button("Save and back",button))
                    { Save.Write(); Screen.fullScreen=Save.Data.fullscreen; Input.TouchEnabled=Save.Data.touch||Application.isMobilePlatform; page=Playing?"pause":"menu"; }
                    break;
                case "results":
                    GUILayout.Label(selected==4?"THE CORE IS FREE — CAMPAIGN COMPLETE":"GUARDIAN DEFEATED",title);
                    GUILayout.Label($"Score {World.Score} • Time {World.Elapsed:F1}s • Gems {World.Gems} • Shards {World.Relics}/3 • Retries {World.Deaths}",label);
                    if(selected<4 && GUILayout.Button("Next stage",button)) StartStage(selected+1);
                    if(GUILayout.Button("Replay",button)) StartStage(selected);
                    if(GUILayout.Button("Main menu",button)) ReturnToMenu(); break;
            }
            if(!string.IsNullOrEmpty(Save.Error))
            { GUILayout.Label(Save.Error,label); if(GUILayout.Button("Retry save",button)) Save.Write(); }
            GUILayout.EndScrollView(); GUILayout.EndArea();
        }
        void OnApplicationPause(bool paused)
        {
            if(paused && Playing) { Paused=true; page="pause"; Time.timeScale=0; }
            if(paused) Save?.Write();
        }
        void OnApplicationQuit() { Save?.Write(); }
        void OnDestroy() { Time.timeScale=1; }
    }
}
