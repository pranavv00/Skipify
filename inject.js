(function () {
  console.log("🔥 Injected script running");

  function getHeatmapSegments() {
    try {
      const data = window.ytInitialPlayerResponse;

      const markers =
        data?.playerOverlays?.playerOverlayRenderer?.decoratedPlayerBarRenderer
          ?.decoratedPlayerBarRenderer?.playerBar
          ?.multiMarkersPlayerBarRenderer?.markersMap;

      if (!markers) return null;

      const heatmapObj = markers.find(m => m.key === "HEATSEEKER");
      if (!heatmapObj) return null;

      const heatMarkers =
        heatmapObj.value.heatmap.heatmapRenderer.heatMarkers;

      // 🔥 Top 3 peaks
      const sorted = [...heatMarkers]
        .sort((a, b) =>
          b.heatMarkerIntensityScoreNormalized -
          a.heatMarkerIntensityScoreNormalized
        )
        .slice(0, 3);

      return sorted.map(m => ({
        start: m.timeRangeStartMillis / 1000,
        end: m.timeRangeStartMillis / 1000 + 10
      }));
    } catch {
      return null;
    }
  }

  function fallback(video) {
    const d = video.duration;

    return [
      { start: d * 0.5, end: d * 0.5 + 10 },
      { start: d * 0.7, end: d * 0.7 + 10 }
    ];
  }

  function sendData() {
    const video = document.querySelector("video");

    let segments = getHeatmapSegments();

    if (!segments) {
      console.log("Fallback segments");
      segments = fallback(video);
    }

    window.postMessage({
      type: "HIGHLIGHT_DATA",
      segments
    }, "*");
  }

  setTimeout(sendData, 4000);
})();