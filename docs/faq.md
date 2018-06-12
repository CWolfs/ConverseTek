# Frequently Asked Questions - ConverseTek v0.1.0

## Conversation Editor

### "Why does my new dialog not work? I've copyed it from an existing one"

Conversion files use unique ids for the conversation itsef, and all dialog nodes. Since _v0.1.0_ does not officially support creating entirely new conversations yet
there might be a clash with the _idRef_s. Check the [Roadmap](https://github.com/CWolfs/ConverseTek/#roadmap) to see the supported features per version.

### "What does an empty dialog node mean?"

![Conversation Empty Node](./images/conversation-empty-node.png)

An empty node is not actually empty, it just has no dialog text associated with it. Battletech uses these mainly as conditional check points, or gateways to larger
branches of dialog. ConverseTek _v0.1.0_ does not support editing **actions** or **conditions**. In later versions you'll be able to select these nodes
and add/remove the actions and conditions.

### "I can drag dialog nodes around but it doesn't seem to do anything at all. When I save and load the conversation everything is reset!"

Dragging dialog nodes around isn't supported in _v0.1.0_. I left in the UI functionality as it'll be a feature **ComingSoon(tm)**.

### "What is an action?"

An **action** is what Battletech uses to trigger something from a dialog node. These may be playing music, with _Play BattleTech Audio Event_ for example, or triggering a
game screen fade with _Set BattleTech Fade_.

### "What is a condition?"