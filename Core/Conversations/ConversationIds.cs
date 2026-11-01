using isogame;

namespace ConverseTek.Conversations;
/*
  Ids in the official conversation files are inconsistent. Sometimes they are `conversationId:id`
  and sometimes just `id`. Comparisons use the part after the colon, matching the editor's getId.
*/
public static class ConversationIds {
  public static string GetRawId(IDRef idRef) {
    return idRef?.id ?? "";
  }

  public static string GetComparableId(string id) {
    if (string.IsNullOrEmpty(id)) {
      return id ?? "";
    }

    string[] parts = id.Split(':');
    return parts.Length > 1 && parts[1] != "" ? parts[1] : id;
  }

  public static string GetId(IDRef idRef) {
    if (idRef == null) {
      return "-1";
    }

    return GetComparableId(idRef.id ?? "");
  }
}
