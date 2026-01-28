---
trigger: always_on
---

Motion: NEVER use Tween or Linear easing. ALL layout changes must use Spring(dampingRatio = 0.8f, stiffness = 300f) (or the closest Expressive token).

Shape: Containers must use "Morphing" shapes where possible. If static, use asymmetric corner radii (e.g., RoundedCornerShape(topStart = 28.dp, bottomEnd = 28.dp, topEnd = 4.dp, bottomStart = 4.dp)).

Typography: Headlines must be Display size but with tight tracking.

Color: Use the Tertiary color role for high-emphasis interactive elements (unlike standard M3 which uses Primary).