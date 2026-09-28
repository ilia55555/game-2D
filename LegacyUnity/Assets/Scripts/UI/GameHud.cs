using UnityEngine;

namespace ProjectVelocity
{
    public sealed class GameHud : MonoBehaviour
    {
        private GUIStyle _titleStyle;
        private GUIStyle _instructionStyle;

        private void OnGUI()
        {
            EnsureStyles();
            GUI.Label(new Rect(24f, 20f, 500f, 42f), "PROJECT VELOCITY — 2.5D PROTOTYPE", _titleStyle);
            GUI.Label(new Rect(26f, 64f, 500f, 90f), "A / D  Move\nSPACE  Jump\nJ  Energy slash\nK  Energy projectile", _instructionStyle);
        }

        private void EnsureStyles()
        {
            if (_titleStyle != null)
            {
                return;
            }

            _titleStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 22,
                fontStyle = FontStyle.Bold,
                normal = { textColor = new Color(0.35f, 0.95f, 1f) }
            };
            _instructionStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 15,
                normal = { textColor = new Color(0.82f, 0.9f, 1f) }
            };
        }
    }
}
