using UnityEngine;
using UnityEngine.InputSystem;
namespace Velocity
{
    [DefaultExecutionOrder(-100)]
    public class GameInput : MonoBehaviour
    {
        public float Move { get; private set; }
        public bool Fire { get; private set; }
        public bool Crouch { get; private set; }
        public bool JumpPressed, JumpReleased, DashPressed, SwitchPressed, PausePressed, FireReleased;
        public int Weapon = -1;
        bool previousTouchJump, previousTouchDash, previousTouchSwitch;
        bool previousFire;
        readonly bool[] touch = new bool[7];
        public bool TouchEnabled;
        public static Rect TouchArea(int i)
        {
            float s = Mathf.Clamp(Mathf.Min(Screen.height * .13f, (Screen.width - 100) / 7f), 28, 100), y = Screen.height - s - 20;
            return i < 3 ? new Rect(20 + i * (s + 10), y, s, s) : new Rect(Screen.width - (7 - i) * (s + 10), y, s, s);
        }
        void Update()
        {
            var k = Keyboard.current; var g = Gamepad.current;
            float horizontal = g == null ? 0 : g.leftStick.x.ReadValue() + g.dpad.x.ReadValue();
            Move = Mathf.Clamp(horizontal + ((k?.dKey.isPressed == true || k?.rightArrowKey.isPressed == true) ? 1 : 0)
                - ((k?.aKey.isPressed == true || k?.leftArrowKey.isPressed == true) ? 1 : 0), -1, 1);
            Fire = k?.jKey.isPressed == true || k?.zKey.isPressed == true || Mouse.current?.leftButton.isPressed == true || g?.buttonWest.isPressed == true;
            Crouch = k?.sKey.isPressed == true || k?.downArrowKey.isPressed == true || g?.dpad.down.isPressed == true;
            JumpPressed = k?.spaceKey.wasPressedThisFrame == true || k?.wKey.wasPressedThisFrame == true || k?.upArrowKey.wasPressedThisFrame == true || g?.buttonSouth.wasPressedThisFrame == true;
            JumpReleased = k?.spaceKey.wasReleasedThisFrame == true || k?.wKey.wasReleasedThisFrame == true || k?.upArrowKey.wasReleasedThisFrame == true || g?.buttonSouth.wasReleasedThisFrame == true;
            DashPressed = k?.leftShiftKey.wasPressedThisFrame == true || k?.kKey.wasPressedThisFrame == true || k?.xKey.wasPressedThisFrame == true || g?.buttonEast.wasPressedThisFrame == true;
            SwitchPressed = k?.qKey.wasPressedThisFrame == true || k?.eKey.wasPressedThisFrame == true || g?.rightShoulder.wasPressedThisFrame == true;
            PausePressed = k?.escapeKey.wasPressedThisFrame == true || k?.pKey.wasPressedThisFrame == true || g?.startButton.wasPressedThisFrame == true;
            Weapon = k?.digit1Key.wasPressedThisFrame == true ? 0 : k?.digit2Key.wasPressedThisFrame == true ? 1 : k?.digit3Key.wasPressedThisFrame == true ? 2 :
                k?.digit4Key.wasPressedThisFrame == true ? 3 : k?.digit5Key.wasPressedThisFrame == true ? 4 : k?.digit6Key.wasPressedThisFrame == true ? 5 : -1;
            System.Array.Clear(touch, 0, touch.Length);
            if (TouchEnabled && Touchscreen.current != null)
                foreach (var t in Touchscreen.current.touches)
                {
                    if (!t.press.isPressed) continue;
                    Vector2 p = t.position.ReadValue(); p.y = Screen.height - p.y;
                    for (int i = 0; i < 7; i++) touch[i] |= TouchArea(i).Contains(p);
                }
            if (touch[0] || touch[1]) Move = (touch[1] ? 1 : 0) - (touch[0] ? 1 : 0);
            Crouch |= touch[2]; Fire |= touch[3];
            JumpPressed |= touch[4] && !previousTouchJump; JumpReleased |= !touch[4] && previousTouchJump;
            DashPressed |= touch[5] && !previousTouchDash; SwitchPressed |= touch[6] && !previousTouchSwitch;
            previousTouchJump = touch[4]; previousTouchDash = touch[5]; previousTouchSwitch = touch[6];
            FireReleased = previousFire && !Fire; previousFire = Fire;
        }
    }
}
