if (window.skipifyLoaded) {
  console.log("Already loaded");
} else {
  window.skipifyLoaded = true;

  let currentTimeout = null;
  let hasPlayed = false;

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
    return localStorage.getItem("highlightEnabled") !== "false";
  }

  function addToggle() {
    if (document.getElementById("toggle-highlight")) return;

    const toggle = document.createElement("button");
    toggle.id = "toggle-highlight";

    toggle.innerText = isEnabled()
      ? "🟢 Skipify ON"
      : "🔴 Skipify OFF";

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
      const current = isEnabled();
      localStorage.setItem("highlightEnabled", (!current).toString());
      location.reload();
    };

    document.body.appendChild(toggle);
  }

  function goToNextVideo() {
    console.log("➡️ Next video");

    const nextBtn = document.querySelector(".ytp-next-button");
    if (nextBtn) nextBtn.click();
  }

  function playOnce(video, start, end) {
    if (hasPlayed) return;
    hasPlayed = true;

    if (currentTimeout) clearTimeout(currentTimeout);

    video.currentTime = start;

    video.play().catch(() => {
      console.log("Autoplay blocked");
    });

    const duration = end - start;

    console.log("🎧 Playing for", duration, "seconds");

    currentTimeout = setTimeout(() => {
      goToNextVideo();
    }, duration * 1000);
  }

  async function init() {
    console.log("🚀 Skipify running...");

    hasPlayed = false;

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
        const segment = event.data.segment;

        if (!segment) {
          console.log("No segment");
          return;
        }

        const CONTEXT = 12;
        let start = Math.max(segment.start - CONTEXT, 0);
        let end = segment.end;

        const minDuration = 60;
        const videoDuration = video.duration;

        if (end - start < minDuration) {
          end = start + minDuration;

          if (end > videoDuration) {
            end = videoDuration - 1;
            start = Math.max(end - minDuration, 0);
          }
        }

        playOnce(video, start, end);
      }
    });
  }

  let lastUrl = location.href;

  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log("🔄 New video");

      if (currentTimeout) clearTimeout(currentTimeout);

      setTimeout(() => {
        window.listenerAdded = false;
        init();
      }, 2000);
    }
  }).observe(document, { subtree: true, childList: true });

  setTimeout(init, 2000);
}