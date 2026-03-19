if (window.skipifyLoaded) {
  console.log("Already loaded");
} else {
  window.skipifyLoaded = true;

  let currentInterval = null;

  function injectScript() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("inject.js");
    script.onload = () => script.remove();
    document.head.appendChild(script);
  }

  function waitForVideo() {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const video = document.querySelector("video");
        if (video && video.duration > 0) {
          clearInterval(interval);
          resolve(video);
        }
      }, 500);
    });
  }

  function isEnabled() {
    const val = localStorage.getItem("skipifyEnabled");
    return val !== "false";
  }

  function addToggle() {
    if (document.getElementById("toggle-highlight")) return;

    const toggle = document.createElement("button");
    toggle.id = "toggle-highlight";

    function updateText() {
      toggle.innerText = isEnabled()
        ? "🟢 Skipify ON"
        : "🔴 Skipify OFF";
    }

    updateText();

    toggle.style.position = "fixed";
    toggle.style.top = "80px";
    toggle.style.right = "20px";
    toggle.style.zIndex = "9999";
    toggle.style.padding = "10px";
    toggle.style.background = "black";
    toggle.style.color = "white";
    toggle.style.border = "none";
    toggle.style.borderRadius = "10px";

    toggle.onclick = () => {
      const newVal = !isEnabled();
      localStorage.setItem("skipifyEnabled", newVal.toString());
      updateText();
    };

    document.body.appendChild(toggle);
  }

  function goToNextVideo() {
    console.log("➡️ Next video");
    const nextBtn = document.querySelector(".ytp-next-button");
    if (nextBtn) nextBtn.click();
  }

  function playSegments(video, segments) {
    let index = 0;

    function playNext() {
      if (index >= segments.length) {
        goToNextVideo();
        return;
      }

      let seg = segments[index];

      const CONTEXT = 12;
      let start = Math.max(seg.start - CONTEXT, 0);
      let end = seg.end;

      const minDuration = 60;
      const videoDuration = video.duration;

      if (end - start < minDuration) {
        end = start + minDuration;

        if (end > videoDuration) {
          end = videoDuration - 1;
          start = Math.max(end - minDuration, 0);
        }
      }

      console.log("🎧 Playing segment", index + 1);

      video.currentTime = start;
      video.play().catch(() => {});

      const target = start + (end - start);

      if (currentInterval) clearInterval(currentInterval);

      currentInterval = setInterval(() => {
        if (video.currentTime >= target) {
          clearInterval(currentInterval);
          index++;
          playNext();
        }
      }, 500);
    }

    playNext();
  }

  async function init() {
    console.log("🚀 Skipify running...");

    const video = await waitForVideo();

    addToggle();

    if (!isEnabled()) {
      console.log("⛔ OFF");
      return;
    }

    injectScript();

    if (window.listenerAdded) return;
    window.listenerAdded = true;

    window.addEventListener("message", (event) => {
      if (event.data.type === "HIGHLIGHT_DATA") {
        const segments = event.data.segments;

        if (!segments || segments.length === 0) return;

        if (!isEnabled()) return;

        playSegments(video, segments);
      }
    });
  }

  let lastUrl = location.href;

  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log("🔄 New video");

      if (currentInterval) clearInterval(currentInterval);

      setTimeout(() => {
        window.listenerAdded = false;
        init();
      }, 2000);
    }
  }).observe(document, { subtree: true, childList: true });

  setTimeout(init, 2000);
}