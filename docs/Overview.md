**ConverseTek: An Open Source Conversation Editor for BattleTech Game**

**Date**: 26th Jan 2024

ConverseTek is a tree-based dialogue editor I developed for modding the game BattleTech. It enables modders to create intricate conversations with branching nodes that encompass dialogue text, actions, and conditions. Actions trigger game logic, while conditions determine the availability of dialogue branches.

**TECHNICAL INNOVATION:**

Utilised BattleTech's game assembly files to convert binary format game dialogue into editable JSON, significantly reducing the time compared to full binary reverse engineering. Chose Chromely for its lightweight nature compared to Electron, and for its compatibility with a C# /.NET backend, essential for reusing BattleTech's prebuilt game assembly.

**DEVELOPMENT JOURNEY:**

The frontend was developed using React, starting with JavaScript and transitioning to TypeScript over five years. Incorporated the MobX state management library, the ANT UI Design System for a user-friendly interface and PostCSS. The backend was implemented in C# using the Chromely framework to integrate a Chromium frontend with a .NET backend.

**STANDOUT SYSTEMS:**

Developed a JSON-based system for dynamic creation of UI elements and validation rules for mod actions and conditions, significantly reducing future workload and minimising the risk of code defects. Incorporated and extended a tree library for the dialogue tree. Supporting important UX features like zooming and ‘Branch Isolation’ to hide branches the user isn’t interested in at the time.

**CONTINUOUS IMPROVEMENT:**

Addressed the initial limitation of being restricted to ‘GET’ and ‘POST’ methods in Chromely's earlier versions. Plans are in place to update ConverseTek to utilise the full range of HTTP methods as supported in Chromely's newer versions. The tool is continuously refined and features are added based on user feedback and technology advancements.

**SUPPORT AND COMMUNITY ENGAGEMENT:**

Over five years, I have actively maintained and enhanced ConverseTek, with 18 releases. This long-term dedication underlines a commitment to sustainable software development and continuous improvement. The tool is community-driven, with regular user interaction shaping its evolution. Responsive support has been provided, addressing issues and queries from users, aiding in building a strong, supportive community.

Working on ConverseTek has been a journey of continuous learning and adaptation. The most rewarding aspect is creating a tool that meets modders' needs and pushes the boundaries of what's possible in game modding, driven by a blend of technical challenge and creative problem-solving.
