using System;
using System.IO;
using UnityEngine;
namespace Velocity
{
    [Serializable] public class BestRun { public int score,gems,relics; public float seconds; }
    [Serializable] public class SaveData
    {
        public int version=2, unlocked;
        public float music=.65f,sfx=.8f;
        public bool assist,fullscreen,touch,shake=true;
        public BestRun[] best=new BestRun[CampaignData.StageCount];
    }
    public class SaveStore
    {
        public SaveData Data { get; private set; } = new SaveData();
        public string Error { get; private set; }
        readonly string path;
        readonly bool memoryOnly;
        public SaveStore(string directory=null,bool memoryOnly=false)
        {
            this.memoryOnly=memoryOnly;
            // Keep the existing filename and Unity product identifier so upgrades find user saves.
            path=Path.Combine(directory??Application.persistentDataPath,"velocity_unity_save.json");
            if(memoryOnly) return;
            foreach(var file in new[]{path,path+".bak"})
                if(File.Exists(file))
                    try { var d=JsonUtility.FromJson<SaveData>(File.ReadAllText(file)); Validate(d); Data=d; Error=null; break; }
                    catch(Exception e) { Error="Could not load save: "+e.Message; }
        }
        public static void Validate(SaveData d)
        {
            if(d==null || (d.version!=1 && d.version!=2) || d.best==null) throw new InvalidDataException("Unsupported save");
            if(d.version==1)
            {
                if(d.best.Length!=5) throw new InvalidDataException("Invalid legacy save");
                // Old score records refer to different levels; retain settings and unlocked progress.
                d.best=new BestRun[CampaignData.StageCount]; d.version=2;
            }
            if(d.best.Length!=CampaignData.StageCount) throw new InvalidDataException("Invalid stage records");
            d.unlocked=Mathf.Clamp(d.unlocked,0,CampaignData.StageCount-1);
            d.music=float.IsNaN(d.music)||float.IsInfinity(d.music) ? .65f : Mathf.Clamp01(d.music);
            d.sfx=float.IsNaN(d.sfx)||float.IsInfinity(d.sfx) ? .8f : Mathf.Clamp01(d.sfx);
            foreach(var r in d.best) if(r!=null)
            {
                r.score=Mathf.Max(0,r.score); r.gems=Mathf.Max(0,r.gems); r.relics=Mathf.Clamp(r.relics,0,3);
                r.seconds=float.IsNaN(r.seconds)||float.IsInfinity(r.seconds) ? 0 : Mathf.Max(0,r.seconds);
            }
        }
        public void Complete(int stage,int score,float seconds,int gems,int relics)
        {
            if(stage<0 || stage>=CampaignData.StageCount) throw new ArgumentOutOfRangeException(nameof(stage));
            Data.unlocked=Mathf.Max(Data.unlocked,Mathf.Min(stage+1,CampaignData.StageCount-1)); var old=Data.best[stage];
            Data.best[stage]=new BestRun{score=Mathf.Max(score,old?.score??0),gems=Mathf.Max(gems,old?.gems??0),relics=Mathf.Max(relics,old?.relics??0),
                seconds=old==null||old.seconds<=0 ? seconds : Mathf.Min(seconds,old.seconds)};
            Validate(Data); Write();
        }
        public bool Write()
        {
            if(memoryOnly) return true;
            try
            {
                Validate(Data); Directory.CreateDirectory(Path.GetDirectoryName(path));
                string json=JsonUtility.ToJson(Data,true), temp=path+".tmp";
                using(var stream=new FileStream(temp,FileMode.Create,FileAccess.Write,FileShare.None))
                using(var writer=new StreamWriter(stream)) { writer.Write(json); writer.Flush(); stream.Flush(true); }
                if(File.ReadAllText(temp)!=json) throw new IOException("Save verification failed");
                Validate(JsonUtility.FromJson<SaveData>(File.ReadAllText(temp)));
                if(File.Exists(path)) File.Replace(temp,path,path+".bak"); else File.Move(temp,path);
                Error=null; return true;
            }
            catch(Exception e) { Error="Progress could not be saved. Retry: "+e.Message; Debug.LogWarning(Error); return false; }
        }
    }
}
