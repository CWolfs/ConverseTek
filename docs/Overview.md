# ConverseTek: An Open Source Conversation Editor for BattleTech

**Date**: 26th Jan 2024
**Updated**: WebView2/Vite desktop host design

ConverseTek is a tree-based dialogue editor for modding BattleTech. It enables modders to create intricate conversations with branching nodes that contain dialogue text, actions, and conditions. Actions trigger game logic, while conditions determine whether dialogue branches are available.

## Technical Innovation

- **Reuse of BattleTech assemblies:** ConverseTek uses BattleTech's game assembly files to read and write the binary conversation format through the same serialisable types the game uses. This avoided a full binary reimplementation.
- **WebView2 desktop host:** The app uses WebView2 / Edge Chromium for the desktop UI runtime while keeping a C# / .NET Framework backend for BattleTech-specific file work.
- **Modern frontend workflow:** Vite powers the frontend build and fast development loop. `CT: Fast Dev` runs the React app through Vite inside the WebView2 desktop shell, so frontend changes hot reload while the backend bridge remains available.

## Development Journey

- **Frontend development:** React, TypeScript, MobX, Ant Design, PostCSS, ESLint, and Vite are used to create the editor interface.
- **Backend development:** C# on .NET Framework 4.7.2 handles file-system access, protobuf serialisation, definition loading, configuration, and provider integrations.
- **Bridge design:** The React app calls backend routes through `app/src/services/api.ts` and `rest.ts`, which send typed WebView2 messages to the route dispatcher under `Host/`.

## Standout Systems

- **Dynamic definition system:** A JSON-based system allows dynamic creation of UI elements and validation rules for mod actions and conditions. This reduces future workload and minimises the risk of introducing code defects.
- **Branching tree UX:** The dialogue tree supports zooming, drag and drop, link nodes, and branch isolation to help modders focus on the conversation section they are editing.
- **Advisory drafting:** The draft system can suggest whole conversations, node rewrites, and branch expansions. Suggestions stay separate from the active conversation until explicitly accepted.
- **Cast personalities:** Workspace-specific cast personality rules help generated dialogue stay in character for vanilla and custom BattleTech casts.

## Continuous Improvement

- **Modern Chromium runtime:** WebView2 moves the app onto current Edge Chromium, so modern CSS and current browser DevTools are available in the production desktop app.
- **Hot reload inside the desktop app:** The Vite development flow removes the need for a full static frontend rebuild after every UI edit.
- **Ongoing development:** ConverseTek continues to be refined and extended based on modding needs and user feedback.

## Support and Community Engagement

- **Long-term commitment:** ConverseTek has been actively maintained over several years with many public releases.
- **Community-driven development:** User feedback directly informs design refinements, workflow improvements, and feature additions.
- **Responsive support:** Issues and questions from modders continue to shape the tool.

Working on ConverseTek has been a journey of continuous learning and adaptation. The most rewarding aspect has been creating a tool that meets modders' needs while pushing what is possible in BattleTech conversation modding.
