(function () {
  console.log("🔥 Injected script running");

  function getHeatmapSegment() {
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

      let max = 0;
      let peak = 0;

      heatMarkers.forEach(m => {
        if (m.heatMarkerIntensityScoreNormalized > max) {
          max = m.heatMarkerIntensityScoreNormalized;
          peak = m.timeRangeStartMillis / 1000;
        }
      });

      return {
        start: peak,
        end: peak + 10
      };
    } catch {
      return null;
    }
  }

  function getFallback() {
    const video = document.querySelector("video");
    if (!video) return null;

    const peak = video.duration * 0.6;

    return {
      start: peak,
      end: peak + 10
    };
  }

  function sendData() {
    let segment = getHeatmapSegment();

    if (!segment) {
      console.log("No heatmap → fallback");
      segment = getFallback();
    }

    window.postMessage({
      type: "HIGHLIGHT_DATA",
      segment
    }, "*");
  }

  setTimeout(sendData, 4000);
})();