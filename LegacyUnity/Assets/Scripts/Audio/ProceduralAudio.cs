using UnityEngine;

namespace ProjectVelocity
{
    [RequireComponent(typeof(AudioSource))]
    public sealed class ProceduralAudio : MonoBehaviour
    {
        private const int SampleRate = 44100;
        private AudioSource _source;
        private AudioClip _jump;
        private AudioClip _shot;
        private AudioClip _slash;

        private void Awake()
        {
            _source = GetComponent<AudioSource>();
            _source.playOnAwake = false;
            _source.spatialBlend = 0.15f;
            _jump = CreateTone("Jump", 0.16f, 360f, 760f, 0.22f);
            _shot = CreateTone("Energy Shot", 0.12f, 880f, 220f, 0.2f);
            _slash = CreateNoise("Slash", 0.18f, 0.16f);
        }

        public void PlayJump()
        {
            _source.PlayOneShot(_jump);
        }

        public void PlayShot()
        {
            _source.PlayOneShot(_shot);
        }

        public void PlaySlash()
        {
            _source.PlayOneShot(_slash);
        }

        private static AudioClip CreateTone(string name, float duration, float startFrequency, float endFrequency, float volume)
        {
            int sampleCount = Mathf.CeilToInt(duration * SampleRate);
            float[] samples = new float[sampleCount];
            float phase = 0f;
            for (int index = 0; index < sampleCount; index++)
            {
                float progress = index / (float)sampleCount;
                float frequency = Mathf.Lerp(startFrequency, endFrequency, progress);
                phase += 2f * Mathf.PI * frequency / SampleRate;
                float envelope = Mathf.Sin(Mathf.PI * progress);
                samples[index] = Mathf.Sin(phase) * envelope * volume;
            }

            AudioClip clip = AudioClip.Create(name, sampleCount, 1, SampleRate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        private static AudioClip CreateNoise(string name, float duration, float volume)
        {
            int sampleCount = Mathf.CeilToInt(duration * SampleRate);
            float[] samples = new float[sampleCount];
            System.Random random = new System.Random(7281);
            float previous = 0f;
            for (int index = 0; index < sampleCount; index++)
            {
                float progress = index / (float)sampleCount;
                float noise = (float)(random.NextDouble() * 2.0 - 1.0);
                previous = Mathf.Lerp(previous, noise, 0.16f);
                samples[index] = previous * (1f - progress) * volume;
            }

            AudioClip clip = AudioClip.Create(name, sampleCount, 1, SampleRate, false);
            clip.SetData(samples, 0);
            return clip;
        }
    }
}
