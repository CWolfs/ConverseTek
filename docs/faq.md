# Frequently Asked Questions - ConverseTek v0.2.1

## Conversation Editor

### "What's the purpose of this tool?"

It's a Battletech sim (non-combat) conversation editor.

Battletech uses a binary data format for its conversations. It isn't possible to edit those files directly so this tool is being developed to allow for editing and creating new conversations.

### "What can the tool do exactly?"

Check out the [Roadmap](https://github.com/CWolfs/ConverseTek/#roadmap) for a full feature list.

### "Is ConverseTek compatible with [ModTek](https://github.com/Mpstark/ModTek)?"

Yes. Conversation files created or edited with ConverseTek work with [ModTek](https://github.com/Mpstark/ModTek) since the conversation files are loaded from the manifest file.

### "Why does my new dialog not work? I've copyed it from an existing one."

Conversations that are initiated must have specific ids per dropship crew member. These ids are found in the `SimGameConstants.json` file under `CrewConversationNames` and `CrewConversationList`. Ensure the conversation id is set to one of these ids if you wish to use your conversation for a one-on-one conversation.

For group conversations or conversations not initiated from clicking the dropship crew member (or menu item), conversation files use unique ids for the conversation itself, and all dialog nodes. Your conversation may have an id clash. To resolve this, select the blue button on the top of the conversation editor (next to the save button). This will regenerate all node ids and may help.

### "What does an empty dialog node mean?"

![Conversation Empty Node](./images/faq/conversation-empty-node.png)

An empty node is not actually empty, it just has no dialog text associated with it. Battletech uses these mainly as conditional check points, or gateways to larger
branches of dialog. ConverseTek _v0.2.1_ does not support editing **actions** or **conditions**. In later versions you'll be able to select any node
and add/remove actions and conditions.

Action and condition icons will be added to the dialog nodes to better indicate which nodes have actions and dialogs.

### "I can drag dialog nodes around but it doesn't seem to do anything at all. When I save and load the conversation everything is reset!"

Dragging dialog nodes around isn't supported in _v0.2.1_. I left in the UI functionality as it'll be a feature **_ComingSoon(tm)_**.

### "What is an action?"

An **action** is what Battletech uses to trigger something from a dialog node. These may be playing music, with `Play BattleTech Audio Event` for example, or triggering a
game screen fade with `Set BattleTech Fade`.

### "What is a condition?"

A **condition** is what Battletech uses to control which dialog branches to display to the player, and which ones to hide. It can check against various things like
your player's history so, for instance, if you selected your back story to include having an accident when you were young you'd check against `commander_youth_accident`. It can also check against game milestone tags like `oc04_post_argo`.

### "When I enter in a 'Cast Id' into the node 'General' details, but then decide to use 'Speaker Id' and save the conversation - the 'Cast Id' is lost. Why?"

This is an logic condition with the conversation system in Battletech itself. If the `sourceInSceneRef` property is set in the conversation file, the game will use this to pick the cast definition by the id. Due to this, if you've decided to use the 'Speaker Id' instead then the `Cast Id` must be remove - so ConverseTek handles this automatically so you don't forget.

### "I've created new conversation file with 'New Convesation'. I can't figure out how to add dialog nodes."

You can't yet with _v0.2.1_. This feature will come in _v0.3.0_.