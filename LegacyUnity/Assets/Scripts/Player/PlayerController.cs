using UnityEngine;
using UnityEngine.InputSystem;

namespace ProjectVelocity
{
    [RequireComponent(typeof(Rigidbody), typeof(CapsuleCollider))]
    public sealed class PlayerController : MonoBehaviour
    {
        [SerializeField] private float moveSpeed = 7f;
        [SerializeField] private float acceleration = 42f;
        [SerializeField] private float airControl = 0.65f;
        [SerializeField] private float jumpForce = 9f;
        [SerializeField] private float groundCheckDistance = 0.18f;

        private Rigidbody _body;
        private CapsuleCollider _collider;
        private Transform _visual;
        private PlayerCombat _combat;
        private float _moveInput;
        private bool _jumpQueued;
        private bool _isGrounded;
        private int _facing = 1;

        public void Configure(Transform visual, PlayerCombat combat)
        {
            _visual = visual;
            _combat = combat;
        }

        private void Awake()
        {
            _body = GetComponent<Rigidbody>();
            _collider = GetComponent<CapsuleCollider>();
        }

        private void Update()
        {
            var keyboard = Keyboard.current;
            _moveInput = 0f;
            if (keyboard?.aKey.isPressed == true || keyboard?.leftArrowKey.isPressed == true)
            {
                _moveInput -= 1f;
            }

            if (keyboard?.dKey.isPressed == true || keyboard?.rightArrowKey.isPressed == true)
            {
                _moveInput += 1f;
            }

            if (keyboard?.spaceKey.wasPressedThisFrame == true)
            {
                _jumpQueued = true;
            }

            if (_moveInput != 0f)
            {
                _facing = _moveInput > 0f ? 1 : -1;
                _visual.localScale = new Vector3(Mathf.Abs(_visual.localScale.x) * _facing, _visual.localScale.y, _visual.localScale.z);
                _combat.SetFacing(_facing);
            }
        }

        private void FixedUpdate()
        {
            _isGrounded = CheckGrounded();
            float control = _isGrounded ? 1f : airControl;
            float targetVelocity = _moveInput * moveSpeed;
            float nextVelocity = Mathf.MoveTowards(_body.linearVelocity.x, targetVelocity, acceleration * control * Time.fixedDeltaTime);
            _body.linearVelocity = new Vector3(nextVelocity, _body.linearVelocity.y, 0f);

            if (_jumpQueued && _isGrounded)
            {
                _body.linearVelocity = new Vector3(_body.linearVelocity.x, jumpForce, 0f);
                GetComponent<ProceduralAudio>().PlayJump();
                ImpactVfx.Spawn(transform.position + Vector3.down * 0.85f, new Color(0.2f, 0.9f, 1f), 8);
            }

            _jumpQueued = false;
        }

        private bool CheckGrounded()
        {
            float bottom = _collider.bounds.min.y + 0.04f;
            Vector3 origin = new Vector3(transform.position.x, bottom, transform.position.z);
            return Physics.Raycast(origin, Vector3.down, groundCheckDistance, ~0, QueryTriggerInteraction.Ignore);
        }
    }
}
