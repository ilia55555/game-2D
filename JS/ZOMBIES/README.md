# Zombie architecture

Every implemented zombie model MUST have its own folder, AI, perception, animation, drawing and attacks as needed. The current source has a WALKER with spawning, sight, navigation and behavior split, and a BRUTE/special visual override. Do not invent six more archetypes just to create placeholders. If seven different zombie models are implemented, seven distinct mechanic file families are required, not a giant 5,000-line script. 700 lines is a signal to split further, never a quota.
