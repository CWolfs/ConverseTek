namespace ConverseTek.Host {
  using ConverseTek.Controllers;

  public static class AppRoutes {
    public static AppRouteDispatcher CreateDefaultDispatcher() {
      AppRouteDispatcher dispatcher = new AppRouteDispatcher();

      new FileSystemController().RegisterRoutes(dispatcher);
      new DefinitionController().RegisterRoutes(dispatcher);
      new ConversationController().RegisterRoutes(dispatcher);
      new AiController().RegisterRoutes(dispatcher);

      return dispatcher;
    }
  }
}
