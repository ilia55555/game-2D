using System.Collections.Generic;
using UnityEngine;
namespace Velocity
{
    // The gameplay root owns physics; the replaceable child owns meshes and animation.
    public class ActorVisual : MonoBehaviour
    {
        Transform pivot, model, muzzle, bodyMuzzle, weaponSocket;
        GameObject weapon, builtInBarrel;
        ActorRig rig;
        Animator animator;
        ModelCatalog catalog;
        Renderer[] renderers;
        readonly Dictionary<string, AnimatorControllerParameterType> parameters = new();
        MaterialPropertyBlock properties;
        float height, flashUntil, warningUntil, facing = 1;
        bool shielded, fallback;
        public Vector3 Muzzle => muzzle ? new Vector3(muzzle.position.x, muzzle.position.y, 0) : transform.position + Vector3.up * height * .7f;

        public void Initialize(ModelCatalog models, string id, float size, Color color)
        {
            if (pivot) { pivot.gameObject.SetActive(false); Destroy(pivot.gameObject); }
            catalog = models; height = size; fallback = false; animator = null; rig = null;
            muzzle = bodyMuzzle = weaponSocket = null; weapon = builtInBarrel = null; parameters.Clear();
            pivot = new GameObject("Facing").transform; pivot.SetParent(transform, false);
            var slot = catalog ? catalog.Find(id) : null;
            if (slot != null && slot.prefab)
            {
                model = Instantiate(slot.prefab, pivot).transform;
                model.localPosition = slot.position; model.localEulerAngles = slot.rotation; model.localScale = slot.scale;
                ModelCatalog.MakeVisualOnly(model.gameObject);
                rig = model.GetComponentInChildren<ActorRig>(true);
                animator = rig && rig.Animator ? rig.Animator : model.GetComponentInChildren<Animator>(true);
                if (animator)
                {
                    animator.applyRootMotion = false;
                    if (slot.controller) animator.runtimeAnimatorController = slot.controller;
                    if (animator.runtimeAnimatorController)
                        foreach (var p in animator.parameters) parameters[p.name] = p.type;
                }
                bodyMuzzle = rig && rig.Muzzle ? rig.Muzzle : FindSocket(model, "Muzzle");
                weaponSocket = rig && rig.WeaponSocket ? rig.WeaponSocket : FindSocket(model, "WeaponSocket");
            }
            else
            {
                fallback = true;
                model = new GameObject("Blockout - replace in AERO Art Setup").transform; model.SetParent(pivot, false);
                Geometry.Primitive("Body", PrimitiveType.Capsule, model, Vector3.up * size * .48f,
                    new Vector3(size * .42f, size * .48f, size * .38f), color);
                Geometry.Primitive("Core", PrimitiveType.Sphere, model, new Vector3(0,size*.65f,-size*.2f), Vector3.one*size*.25f, Color.white);
                builtInBarrel = Geometry.Box("Barrel", model, new Vector3(size*.48f,size*.7f,0), new Vector3(size*.5f,size*.13f,size*.15f), color*.6f);
                if (id == "hero")
                    for (int i = -1; i <= 1; i += 2)
                        Geometry.Primitive("Rabbit ear", PrimitiveType.Capsule, model, new Vector3(i*.09f,size*1.13f,0), new Vector3(.09f,.21f,.08f), color);
            }
            if (!bodyMuzzle)
            {
                bodyMuzzle = new GameObject("Muzzle").transform; bodyMuzzle.SetParent(model, false);
                // Fallback coordinates are in gameplay metres, not scaled Blender units.
                bodyMuzzle.SetParent(pivot, false); bodyMuzzle.localPosition = new Vector3(size*.72f,size*.7f,0);
            }
            if (!weaponSocket)
            {
                weaponSocket = new GameObject("WeaponSocket").transform; weaponSocket.SetParent(pivot, false);
                weaponSocket.localPosition = new Vector3(size*.3f,size*.7f,0);
            }
            muzzle = bodyMuzzle;
            pivot.localRotation = Quaternion.Euler(0, facing < 0 ? 180 : 0, 0);
            RefreshRenderers();
        }
        static Transform FindSocket(Transform root, string name)
        {
            foreach (var t in root.GetComponentsInChildren<Transform>(true)) if (t.name == name) return t;
            return null;
        }
        void RefreshRenderers() { renderers = pivot.GetComponentsInChildren<Renderer>(); properties = new MaterialPropertyBlock(); }
        public void EquipWeapon(int index)
        {
            if (!pivot) return;
            if (weapon) { weapon.SetActive(false); Destroy(weapon); }
            var spec = WeaponCatalog.Get(index); var slot = catalog ? catalog.Find(spec.Model) : null;
            if (slot != null && slot.prefab)
            {
                weapon = Instantiate(slot.prefab, weaponSocket);
                weapon.transform.localPosition = slot.position; weapon.transform.localEulerAngles = slot.rotation; weapon.transform.localScale = slot.scale;
                ModelCatalog.MakeVisualOnly(weapon);
            }
            else if (fallback)
            {
                weapon = Geometry.Box(spec.Name, weaponSocket, new Vector3(.16f,0,0), new Vector3(.35f,.09f,.1f), spec.Color);
                var end = new GameObject("Muzzle").transform; end.SetParent(weapon.transform, false); end.localPosition = Vector3.right*.6f;
            }
            else weapon = null;
            muzzle = weapon ? FindSocket(weapon.transform,"Muzzle") : bodyMuzzle;
            if (!muzzle) muzzle = bodyMuzzle;
            if (builtInBarrel) builtInBarrel.SetActive(!weapon);
            if (rig && rig.BuiltInWeaponParts != null)
                foreach (var part in rig.BuiltInWeaponParts) if (part) part.SetActive(!weapon);
            Float("Weapon",index); RefreshRenderers();
        }
        public void Pose(float direction, Vector3 velocity, bool grounded, bool crouch, bool dash)
        {
            if (!pivot) return;
            facing = direction; pivot.localRotation = Quaternion.Euler(0, direction < 0 ? 180 : 0, 0);
            Float("Speed",Mathf.Abs(velocity.x)); Float("VerticalSpeed",velocity.y);
            Bool("Grounded",grounded); Bool("Crouching",crouch); Bool("Dashing",dash);
            if (fallback) model.localScale = new Vector3(1,crouch ? .66f : 1,1);
            properties.SetColor("_EmissionColor",Time.time < flashUntil ? Color.white*2 : shielded ? new Color(.2f,.5f,1)*2 :
                Time.time < warningUntil ? new Color(1,.5f,.05f)*2 : Color.black);
            foreach (var r in renderers) if (r) r.SetPropertyBlock(properties);
        }
        bool Has(string name, AnimatorControllerParameterType type) => animator && parameters.TryGetValue(name,out var actual) && actual == type;
        void Float(string name,float value) { if (Has(name,AnimatorControllerParameterType.Float)) animator.SetFloat(name,value); }
        public void SetCharge(float value) { Float("Charge",value); Bool("Charging",value > 0); }
        public void SetAnimationSpeed(float value) { if (animator) animator.speed = value; }
        public void Bool(string name,bool value)
        { if (name == "Shielded") shielded = value; if (Has(name,AnimatorControllerParameterType.Bool)) animator.SetBool(name,value); }
        public void Trigger(string name)
        { if (name == "Death") Bool("Dead",true); if (name == "Telegraph") warningUntil = Time.time + 1.05f; if (Has(name,AnimatorControllerParameterType.Trigger)) animator.SetTrigger(name); }
        public void Flash() { flashUntil = Time.time + .12f; Trigger("Hurt"); }
    }
}
