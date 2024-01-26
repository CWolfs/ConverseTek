# ConverseTek: An Open Source Conversation Editor for BattleTech

**Date**: 26th Jan 2024

ConverseTek is a tree-based dialogue editor I developed for modding the game BattleTech. It enables modders to create intricate conversations with branching nodes that encompass dialogue text, actions, and conditions. Actions trigger game logic, while conditions determine the availability of dialogue branches.

### Technical Innovation

- **Reverse Engineering:** Leveraged BattleTech's game assembly files to convert binary format game dialogue into editable JSON. This approach was a significant time-saver compared to full binary reverse engineering.
- **Chromely Framework:** Chose Chromely for its lightweight nature compared to Electron, and for its compatibility with a C# /.NET backend, crucial for reusing BattleTech's prebuilt game assembly.

### Development Journey

- **Frontend Development:** React is used for this project. It was started with JavaScript, transitioning to TypeScript over the project's five year lifespan. MobX state management library and the ANT UI Design System is used to create a user-friendly interface. PostCSS and linting are used.
- **Backend Development:** C# is used with Chromely framework to integrate a Chromium frontend with a .NET backend.

### Standout Systems

- **Dynamic Definition System:** Developed a JSON-based system allowing dynamic creation of UI elements and validation rules for mod actions and conditions. This innovation drastically reduced future workload and minimised the risk of introducing code defects.
- **Branching Tree UX:** Incorporated and extended a tree library for the dialogue tree. Supporting important UX features like zooming, drag & drop, and ‘Branch Isolation’ to hide branches to focus the modder.

### Continuous Improvement

- **HTTP Method Limitation:** Initially limited to ‘GET’ and ‘POST’ methods due to Chromely's version constraints. Planning to update ConverseTek to utilise the full range of HTTP methods, as supported in Chromely's newer versions.
- **Ongoing Development:** Continuously refining and adding features based on user feedback and technology advancements.

### Support and Community Engagement

- **Long-Term Commitment:** Over the past five years, I have actively maintained and enhanced ConverseTek, rolling out 18 releases. This long-term dedication highlights my commitment to sustainable software development and continuous improvement.
- **Community-Driven Development:** The tool has been embraced by a vibrant community of users who interact with it daily. This engagement has been important in shaping its evolution, as user feedback directly informs design enhancements and feature updates.
- **Responsive Support:** I have provided consistent support, addressing issues and queries from users. This responsiveness not only improved the tool but also helped in building a strong, supportive community around it.

Working on ConverseTek has been a journey of continuous learning and adaptation. The most rewarding aspect has been creating a tool that not only meets modders' needs but also pushes the boundaries of what's possible in game modding. The blend of technical challenge and creative problem-solving is what drives my passion for this project.
