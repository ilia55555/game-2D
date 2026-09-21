using UnityEngine;

namespace ProjectVelocity
{
    public static class ImpactVfx
    {
        public static void Spawn(Vector3 position, Color color, int particleCount)
        {
            GameObject effect = new GameObject("Impact VFX");
            effect.transform.position = position;
            ParticleSystem particles = effect.AddComponent<ParticleSystem>();

            ParticleSystem.MainModule main = particles.main;
            main.duration = 0.35f;
            main.loop = false;
            main.startLifetime = new ParticleSystem.MinMaxCurve(0.18f, 0.42f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(1.5f, 4f);
            main.startSize = new ParticleSystem.MinMaxCurve(0.05f, 0.18f);
            main.startColor = color;
            main.simulationSpace = ParticleSystemSimulationSpace.World;

            ParticleSystem.EmissionModule emission = particles.emission;
            emission.enabled = false;

            ParticleSystem.ShapeModule shape = particles.shape;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = 0.12f;

            ParticleSystemRenderer renderer = particles.GetComponent<ParticleSystemRenderer>();
            Material material = new Material(Shader.Find("Particles/Standard Unlit"));
            material.color = color;
            renderer.material = material;

            particles.Emit(particleCount);
            Object.Destroy(effect, 0.8f);
        }
    }
}
