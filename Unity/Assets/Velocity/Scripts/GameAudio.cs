using UnityEngine;
namespace Velocity
{
    public class GameAudio : MonoBehaviour
    {
        public SaveStore Save;
        AudioSource music;
        AudioSource[] voices;
        int voice;
        string track;
        void Awake()
        {
            music=gameObject.AddComponent<AudioSource>(); music.loop=true; music.playOnAwake=false;
            voices=new AudioSource[16];
            for(int i=0;i<voices.Length;i++) { voices[i]=gameObject.AddComponent<AudioSource>(); voices[i].playOnAwake=false; }
        }
        public void Music(string name)
        {
            if(track==name) return; track=name;
            music.clip=Resources.Load<AudioClip>("Velocity/Audio/music/"+name);
            if(music.clip) music.Play();
        }
        public void Play(string name,float pitch=1,float volume=1)
        {
            var clip=Resources.Load<AudioClip>("Velocity/Audio/sfx/"+name); if(!clip) return;
            var source=voices[voice++%voices.Length]; source.pitch=pitch; source.volume=volume*(Save?.Data.sfx??.8f); source.clip=clip; source.Play();
        }
        void Update() { if(Save!=null) music.volume=Save.Data.music; }
    }
}
