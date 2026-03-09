(() => {
  const adapters = [
    window.ChatGptArchiveAdapter,
    window.GeminiArchiveAdapter
  ].filter(Boolean);

  window.getArchiveAdapterByLocation = (locationLike) => {
    return adapters.find((adapter) => adapter.matches(locationLike)) || null;
  };
})();
