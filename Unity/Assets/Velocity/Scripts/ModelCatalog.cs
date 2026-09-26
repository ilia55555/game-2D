using System;
using UnityEngine;
namespace Velocity
{
    [Serializable] public class ModelSlot
    {
        public string id;
        public GameObject prefab;
        public RuntimeAnimatorController controller;
        public Vector3 position, rotation;
        public Vector3 scale = Vector3.one;
    }
    [CreateAssetMenu(menuName = "Velocity/3D Model Catalog")]
    public class ModelCatalog : ScriptableObject
    {
        public ModelSlot[] models = Array.Empty<ModelSlot>();
        public ModelSlot Find(string id) => models == null ? null : Array.Find(models, s => s != null && s.id == id);
        public static void MakeVisualOnly(GameObject visual)
        {
            foreach (var t in visual.GetComponentsInChildren<Transform>(true)) t.gameObject.layer = Layers.Decoration;
            foreach (var c in visual.GetComponentsInChildren<Collider>(true)) c.enabled = false;
            foreach (var rb in visual.GetComponentsInChildren<Rigidbody>(true)) { rb.isKinematic = true; rb.detectCollisions = false; }
        }
    }
    public static class Geometry
    {
        static readonly System.Collections.Generic.Dictionary<Color, Material> Materials = new();
        public static Material Material(Color color)
        {
            if (Materials.TryGetValue(color, out var cached) && cached) return cached;
            var template = Resources.Load<Material>("Velocity/Standard");
            var m = template ? new Material(template) : new Material(Shader.Find("Standard"));
            m.color = color; m.EnableKeyword("_EMISSION");
            m.SetFloat("_Glossiness", .32f);
            Materials[color] = m;
            return m;
        }
        public static GameObject Primitive(string name, PrimitiveType kind, Transform parent, Vector3 pos, Vector3 scale, Color color, bool solid = false)
        {
            var go = GameObject.CreatePrimitive(kind); go.name = name;
            go.transform.SetParent(parent, false); go.transform.localPosition = pos; go.transform.localScale = scale;
            go.layer = solid ? Layers.World : Layers.Decoration;
            var collider = go.GetComponent<Collider>();
            if (!solid) { collider.enabled = false; UnityEngine.Object.Destroy(collider); }
            go.GetComponent<Renderer>().sharedMaterial = Material(color);
            return go;
        }
        public static GameObject Box(string name, Transform parent, Vector3 pos, Vector3 size, Color color, bool solid = false)
            => Primitive(name, PrimitiveType.Cube, parent, pos, size, color, solid);
    }
}
