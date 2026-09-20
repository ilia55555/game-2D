using UnityEngine;

namespace ProjectVelocity
{
    public sealed class CameraFollow : MonoBehaviour
    {
        [SerializeField] private Vector3 offset = new Vector3(0f, 1.2f, -12f);
        [SerializeField] private float smoothTime = 0.2f;
        private Transform _target;
        private Vector3 _velocity;

        public void Configure(Transform target)
        {
            _target = target;
        }

        private void LateUpdate()
        {
            if (_target == null)
            {
                return;
            }

            Vector3 destination = _target.position + offset;
            destination.y = Mathf.Max(destination.y, 0.8f);
            transform.position = Vector3.SmoothDamp(transform.position, destination, ref _velocity, smoothTime);
        }
    }
}
