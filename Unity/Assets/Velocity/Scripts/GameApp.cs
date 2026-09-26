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
        public CampaignData Campaign => campaign;
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
            if(index<0 || index>=campaign.stages.Length || index>Save.Data.unlocked) return;
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
                DrawHud();
                if(World.BossStarted && !World.BossDefeated && World.Boss)
                {
                    var rect=new Rect(Screen.width*.2f,144,Screen.width*.6f,28);
                    GUI.Box(rect,$"{World.Boss.DisplayName}    {World.Boss.Health} / {World.Boss.MaxHealth}    {World.Boss.State.ToUpperInvariant()}");
                    GUI.color=World.Data.Accent; GUI.DrawTexture(new Rect(rect.x,rect.y+29,rect.width*World.Boss.Health/World.Boss.MaxHealth,5),Texture2D.whiteTexture); GUI.color=Color.white;
                }
                // Nearby tutorial signs are shown in the HUD, not as camera-facing world sprites.
                foreach(var sign in World.Data.signs)
                    if(Mathf.Abs(World.Player.transform.position.x-sign.x/100)<2) GUI.Label(new Rect(30,188,Screen.width-60,50),sign.text,label);
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
            GUI.contentColor=new Color(.3f,.85f,1); GUILayout.Label("AERO",title); GUI.contentColor=Color.white;
            GUILayout.Label("SPEED • WEAPONS • ADVENTURE  /  2.5D",label); GUILayout.Space(20);
            switch(page)
            {
                case "menu":
                    if(GUILayout.Button("Continue journey",button)) StartStage(Save.Data.unlocked);
                    if(GUILayout.Button("Stage select",button)) page="stages";
                    if(GUILayout.Button("Settings",button)) page="settings";
                    GUILayout.Space(14); GUILayout.Label("Move A/D • Jump Space (twice) • Fire J / click • Dash Shift • Weapon Q / 1–6 • Duck S • Pause Esc",label);
                    GUILayout.Label("Gamepad: left stick / D-pad • A jump • X fire • B dash • RB weapon • Start pause",label);
                    GUILayout.Label("Charge laser: hold fire, then release. Ice freezes enemies; rockets and plasma deal splash damage.",label);
                    break;
                case "stages":
                    for(int i=0;i<campaign.stages.Length;i++)
                    {
                        GUI.enabled=i<=Save.Data.unlocked;
                        var best=Save.Data.best[i];
                        if(GUILayout.Button($"{i+1}. {campaign.stages[i].title}"+(best!=null?$"  [{best.score}]":""),button)) StartStage(i);
                        GUILayout.Label(campaign.stages[i].subtitle,label);
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
                    GUILayout.Label(selected==campaign.stages.Length-1?"VEXAR DEFEATED — CAMPAIGN COMPLETE":"GUARDIAN DEFEATED",title);
                    GUILayout.Label($"Score {World.Score} • Time {World.Elapsed:F1}s • Gems {World.Gems} • Shards {World.Relics}/3 • Retries {World.Deaths}",label);
                    if(selected<campaign.stages.Length-1 && GUILayout.Button("Next stage",button)) StartStage(selected+1);
                    if(GUILayout.Button("Replay",button)) StartStage(selected);
                    if(GUILayout.Button("Main menu",button)) ReturnToMenu(); break;
            }
            if(!string.IsNullOrEmpty(Save.Error))
            { GUILayout.Label(Save.Error,label); if(GUILayout.Button("Retry save",button)) Save.Write(); }
            GUILayout.EndScrollView(); GUILayout.EndArea();
        }
        void DrawHud()
        {
            var p=World.Player;
            GUI.Box(new Rect(12,12,Screen.width-24,126),"");
            GUI.Label(new Rect(24,20,Screen.width-48,26),$"{World.Data.title}   /   COINS {World.Gems}   /   CORES {World.Relics}/3   /   SCORE {World.Score}",label);
            float heartsWidth=Mathf.Min(200,Screen.width*.25f);
            for(int i=0;i<p.MaxHealth/2;i++)
            {
                GUI.color=new Color(.18f,.2f,.25f); GUI.DrawTexture(new Rect(24+i*28,52,23,12),Texture2D.whiteTexture);
                GUI.color=new Color(1,.2f,.35f); GUI.DrawTexture(new Rect(24+i*28,52,23*Mathf.Clamp01((p.Health-i*2)/2f),12),Texture2D.whiteTexture);
            }
            GUI.color=new Color(.2f,.8f,1); GUI.DrawTexture(new Rect(heartsWidth+32,52,Mathf.Min(180,Screen.width*.2f)*p.Energy/100,7),Texture2D.whiteTexture);
            GUI.color=Color.white;
            GUI.Label(new Rect(heartsWidth+32,60,Screen.width-heartsWidth-50,23),$"ENERGY {(int)p.Energy}   DASH {(p.DashReady>=1?"READY":"...")}"+(p.Charge>0?$"   CHARGE {(int)(p.Charge*100)}%":""));
            float width=(Screen.width-48)/WeaponCatalog.Count;
            for(int i=0;i<WeaponCatalog.Count;i++)
            {
                var spec=WeaponCatalog.Get(i); GUI.color=i==p.Weapon?spec.Color:new Color(.65f,.7f,.8f);
                GUI.Box(new Rect(24+i*width,89,width-4,27),$"{i+1} {spec.Name}");
            }
            GUI.color=Color.white;
            if(!string.IsNullOrEmpty(World.Banner)) GUI.Label(new Rect(24,Screen.height-48,Screen.width-150,35),World.Banner,label);
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
