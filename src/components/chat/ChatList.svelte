<script>
    import { ChatType } from "../../types/enums";
    import { Message } from "../../types/message";
    import { User } from "../../types/user";
    import ChatElement from "./ChatElement.svelte";
</script>

<div class="list">
  <ChatElement id={-1} type={ChatType.DM} userId={1} lastSenderId=1 lastMessage={new Message()}></ChatElement>
  <ChatElement id={-2} type={ChatType.DM} userId={2} lastSenderId=2 lastMessage={new Message()}></ChatElement>
  <ChatElement id={-15} type={ChatType.DM} userId={15} lastSenderId=15 lastMessage={new Message()}></ChatElement>
  <ChatElement id={-4} type={ChatType.DM} userId={4} lastSenderId=4 lastMessage={new Message()}></ChatElement>
  <ChatElement id={-5} type={ChatType.DM} userId={5} lastSenderId=5 lastMessage={new Message()}></ChatElement>
  <ChatElement id={-6} type={ChatType.DM} userId={6} lastSenderId=6 lastMessage={new Message()}></ChatElement>
  <ChatElement id={-7} type={ChatType.DM} userId={7} lastSenderId=7 lastMessage={new Message()}></ChatElement>
  <ChatElement id={-8} type={ChatType.DM} userId={8} lastSenderId=8 lastMessage={new Message()}></ChatElement>
    <!-- тут будут сообщения -->
</div>

<style>
    .list {
        display: flex;
        flex-direction: column;
        flex: 1 1 0%;
        min-height: 0; 
        overflow-y: auto;
        overflow-x: hidden;
        margin: 10px;
        color: var(--text-color);
        padding: 5px;
    }
</style>