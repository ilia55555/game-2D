using UnityEngine;
namespace Velocity
{
    // Gameplay owns the root and colliders. Imported FBX prefabs only own the visual child.
    public class ActorVisual : MonoBehaviour
    {
        Transform pivot, model, muzzle;
        Animator animator;
        Renderer[] renderers;
        MaterialPropertyBlock properties;
        float height, flashUntil, warningUntil;
        bool shielded;
        bool fallback;
        public Vector3 Muzzle => muzzle ? new Vector3(muzzle.position.x, muzzle.position.y, 0) : transform.position + Vector3.up * height * .7f;
        public void Initialize(ModelCatalog catalog, string id, float size, Color color)
        {
            height = size;
            pivot = new GameObject("Facing").transform; pivot.SetParent(transform, false);
            var slot = catalog ? catalog.Find(id) : null;
            if (slot != null && slot.prefab)
            {
                model = Instantiate(slot.prefab, pivot).transform;
                model.localPosition = slot.position; model.localEulerAngles = slot.rotation; model.localScale = slot.scale;
                foreach (var c in model.GetComponentsInChildren<Collider>()) c.enabled = false;
                foreach (var rb in model.GetComponentsInChildren<Rigidbody>()) { rb.isKinematic = true; rb.detectCollisions = false; }
                animator = model.GetComponentInChildren<Animator>();
                if (animator) animator.applyRootMotion = false;
                foreach (var t in model.GetComponentsInChildren<Transform>()) if (t.name == "Muzzle") { muzzle = t; break; }
            }
            else
            {
                fallback = true;
                model = new GameObject("Temporary 3D visual - assign ModelCatalog").transform; model.SetParent(pivot, false);
                Geometry.Primitive("Body", PrimitiveType.Capsule, model, Vector3.up * size * .48f, new Vector3(size * .42f, size * .48f, size * .38f), color);
                Geometry.Primitive("Core", PrimitiveType.Sphere, model, new Vector3(0, size * .65f, -size * .2f), Vector3.one * size * .25f, Color.white);
                Geometry.Box("Barrel", model, new Vector3(size * .48f, size * .7f, 0), new Vector3(size * .5f, size * .13f, size * .15f), color * .6f);
            }
            if (!muzzle)
            {
                muzzle = new GameObject("Muzzle").transform; muzzle.SetParent(pivot, false);
                muzzle.localPosition = new Vector3(size * .72f, size * .7f, 0);
            }
            renderers = model.GetComponentsInChildren<Renderer>(); properties = new MaterialPropertyBlock();
        }
        public void Pose(float facing, Vector3 velocity, bool grounded, bool crouch, bool dash)
        {
            if (!pivot) return;
            pivot.localRotation = Quaternion.Euler(0, facing < 0 ? 180 : 0, 0);
            Float("Speed", Mathf.Abs(velocity.x)); Float("VerticalSpeed", velocity.y);
            Bool("Grounded", grounded); Bool("Crouching", crouch); Bool("Dashing", dash);
            if (fallback) model.localScale = new Vector3(1, crouch ? .66f : 1, 1);
            properties.SetColor("_EmissionColor", Time.time < flashUntil ? Color.white * 2 : shielded ? new Color(.2f,.5f,1f) * 2 : Time.time < warningUntil ? new Color(1,.5f,.05f) * 2 : Color.black);
            foreach (var r in renderers) if (r) r.SetPropertyBlock(properties);
        }
        bool Has(string name, AnimatorControllerParameterType type)
        {
            if (!animator || !animator.runtimeAnimatorController) return false;
            foreach (var p in animator.parameters) if (p.name == name && p.type == type) return true;
            return false;
        }
        void Float(string name, float value) { if (Has(name, AnimatorControllerParameterType.Float)) animator.SetFloat(name, value); }
        public void Bool(string name, bool value) { if (name == "Shielded") shielded = value; if (Has(name, AnimatorControllerParameterType.Bool)) animator.SetBool(name, value); }
        public void Trigger(string name) { if (name == "Telegraph") warningUntil = Time.time + 1.05f; if (Has(name, AnimatorControllerParameterType.Trigger)) animator.SetTrigger(name); }
        public void Flash() { flashUntil = Time.time + .12f; Trigger("Hurt"); }
    }
}
