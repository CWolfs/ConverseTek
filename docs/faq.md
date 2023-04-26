# Frequently Asked Questions - ConverseTek v1.1.2

## Conversation Editor

### "What's the purpose of this tool?"

It's a Battletech sim (non-combat) conversation editor.

Battletech uses a binary data format for its conversations. It isn't possible to edit those files directly so this tool is being developed to allow for editing and creating new conversations.

### "What can the tool do exactly?"

Check out the [Roadmap](https://github.com/CWolfs/ConverseTek/#roadmap) for a full feature list.

### "Is ConverseTek compatible with [ModTek](https://github.com/Mpstark/ModTek)?"

Yes. Conversation files created or edited with ConverseTek work with [ModTek](https://github.com/Mpstark/ModTek) since the conversation files are loaded from the manifest file.

### "Why does my new dialog not work? I've copied it from an existing one."

Conversations that are initiated must have specific ids per dropship crew member. These ids are found in the `SimGameConstants.json` file under `CrewConversationNames` and `CrewConversationList`. Ensure the conversation id is set to one of these ids if you wish to use your conversation for a one-on-one conversation.

For group conversations or conversations not initiated from clicking the dropship crew member (or menu item), conversation files use unique ids for the conversation itself, and all dialog nodes. Your conversation may have an id clash. To resolve this, select the blue button on the top of the conversation editor (next to the save button). This will regenerate all node ids and may help.

### "What does an empty dialog node mean?"

![Conversation Empty Node](./images/faq/conversation-empty-node.png)

An empty node is not actually empty, it just has no dialog text associated with it. Battletech uses these for a few reason:

- As a conditional check point
- As a 'autofollow' conversation branch. This allows for the same character, or a new non-player character, to continue talking

You can add conditions to a node by selecting the node you wish to add a condition to, select the 'Conditions' tab on the bottom right of ConverseTek - then select the blue '+' button. If you have mulitple conditions you may need to scroll to the bottom to see the add button.

### "I've added an empty response node with other responses. When I test it in-game, the conversation skips the entire branch level and follows down the path of the empty response. Why is this?"

This is how the BattleTech conversation system has been designed. If the system encounters any empty code, it will follow it to the next level. This feature can be useful in certain situations, for example, if you want a branch to follow to a single-use dialog branch. After that offshoot branch has been used by the player then the dialog will only show the other responses if you have a condition to prevent it from following down that path.

### "I've set 'Only Once' on a response but it still shows up when I return to the character to talk to them."

Make sure you don't have 'Always Show' selected in the node general options. This will override 'Only Once'.

### "What does 'Always Show' do?"

Always show does what it says. This means that even if 'Only Once' is selected, or the response fails any/all its conditions, the response will still be displayed.

### "I can drag dialog nodes around but it doesn't always seem to work!"

Make sure when dragging nodes that you move the node _directly_ into the highlighted zone. Node dragging will only work in certain situations. These situations are:

- _Roots_ can be dragged up or down within the _Root_ level

- _Nodes_ can be dragged into a different empty _Root_
- _Nodes_ can be dragged into a different empty _Response_

- _Responses_ can be dragged up or down within their _Node_ level

### "What is an action?"

An **action** is what Battletech uses to trigger something from a dialog node. These may be playing music, with `Play BattleTech Audio Event` for example, or triggering a game screen fade with `Set BattleTech Fade`.

### "What is a condition?"

A **condition** is what Battletech uses to control which dialog branches to display to the player, and which ones to hide. It can check against various things like
your player's history so, for instance, if you selected your back story to include having an accident when you were young you'd check against `commander_youth_accident`. It can also check against game milestone tags like `oc04_post_argo`.

### "How did I add a condition, or an action?"

Select the root, node or response you wish to add to, then select the appropriate tab (`Conditions` or `Actions`) on the bottom right of ConverseTek. Select the blue '+' button to add a new item.

### "When I enter in a 'Cast Id' into the node 'General' details, but then decide to use 'Speaker Id' and save the conversation - the 'Cast Id' is lost. Why?"

This is an logic condition with the conversation system in Battletech itself. If the `sourceInSceneRef` property is set in the conversation file, the game will use this to pick the cast definition by the id. Due to this, if you've decided to use the 'Speaker Id' instead then the `Cast Id` must be remove - so ConverseTek handles this automatically so you don't forget.

### "I've created new conversation file with 'New Convesation'. I can't figure out how to add dialog nodes."

You can access the context menu by right-clicking any conversation node. Depending on the type of the node you will be presented with different options. You'll see the 'Add' and 'Delete' options there.

### "I'm trying to create a second node from a response. Why is there no option when I right-click for adding it?"

Responses only ever have _one_ node that follows it. You cannot add a second node to a response. The ability to _insert_ a new node and response in front of an existing response/node link will come in a later version of ConverseTek.

### "I've created a small conversation but Battletech seems to be jumping to the end of my conversation. Why is this?"

This is usually because the conversation is too short and doesn't satisfy the rules in the Battletech conversation system. Ideally, your conversation should be structured as follows:

- An empty root at the start of the conversation (future proofed for actions and conditions to gate the branch)
- A non-empty node after that empty root
- A non-empty response after that node

### "How do I link back to a previous part in a conversation, for example, when returning to a list of questions after one question has been answered?"

You achiveve this with _links_. Right-click the node you wish the conversation to return to, select '_Copy_'. Then right-click the end of the conversation branch just before you loop back to copied section. Now select '_Paste as Link_'.

Remember, you can only link from a _Response_ (yellow) to a _Node_ (blue).

### "I've copied some dialog from another mod but the tool won't open it. Why?"

They are probably using `ExtendedConversations` mod which adds many more dialog tags, conditions, actions and features. If a conversation is using one of those features then you will need to use the mod and install the ConverseTek definitions that come with it.

### I've created a lot of response nodes under a prompt node in a conversation and now my conversation doesn't work in BT. Why?

There is a hard limit of 10 responses per prompt node that exists in the game itself. If you have 11 or more responses to a single node, your conversation will break.

### I can't get any conditionals to take effect / conditions don't work! Why?!

Due to the nature of the BT dialogue system, all prompt nodes (blue nodes) that have a conditional on them require an empty response node (yellow) to follow it. Empty response nodes just get followed by the conversation system so you won't see the empty response in the actual conversation - think of it as the conversation logic process.
