<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import ParseTab from "./ParseTab.svelte";
  import FileLibraryTab from "./FileLibraryTab.svelte";

  type LightboxItem = {
    url: string;
    type: "video" | "image";
    title?: string;
    author?: string;
    platform?: string;
    original_url?: string;
  };

  let activeTab = $state<"parse" | "files">("parse");

  function syncHash() {
    const hash = location.hash.replace("#", "");
    if (hash === "files" || hash === "parse") activeTab = hash;
  }
  function setTab(tab: "parse" | "files") {
    activeTab = tab;
    history.replaceState(null, "", `#${tab}`);
  }

  // Lightbox state
  let lbOpen = $state(false);
  let lbItems = $state<LightboxItem[]>([]);
  let lbIndex = $state(0);

  // Lightbox DOM - rendered on document.body to escape parent transforms
  let lbRoot: HTMLDivElement | null = null;
  let lbCleanups: (() => void)[] = [];

  onMount(() => {
    syncHash();
    window.addEventListener("hashchange", syncHash);
    lbRoot = document.createElement("div");
    document.body.appendChild(lbRoot);
  });

  onDestroy(() => {
    window.removeEventListener("hashchange", syncHash);
    lbCleanups.forEach((fn) => fn());
    lbCleanups = [];
    lbRoot?.remove();
    document.body.style.overflow = "";
  });

  // Reactive lightbox rendering on body
  $effect(() => {
    // Capture reactive deps
    const open = lbOpen;
    const items = lbItems;
    const idx = lbIndex;

    if (!lbRoot) return;

    // Cleanup previous listeners
    lbCleanups.forEach((fn) => fn());
    lbCleanups = [];

    if (!open) {
      lbRoot.innerHTML = "";
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    const item = items[idx];

    const safeUrl = escHtml(item?.url || "");
    const mediaHtml = item?.type === "video"
      ? `<video controls playsinline class="media-lb-media"><source src="${safeUrl}" type="video/mp4"></video>`
      : `<img src="${safeUrl}" alt="" class="media-lb-media">`;
    const counter = items.length > 1 ? `<div class="media-lb-counter">${idx + 1} / ${items.length}</div>` : "";

    const infoParts: string[] = [];
    if (item?.platform) infoParts.push(`<span class="media-lb-tag">${escHtml(item.platform)}</span>`);
    if (item?.title) infoParts.push(`<span class="media-lb-title">${escHtml(item.title)}</span>`);
    if (item?.author) infoParts.push(`<span class="media-lb-author">@${escHtml(item.author)}</span>`);
    if (item?.original_url) infoParts.push(`<a href="${escHtml(item.original_url)}" target="_blank" rel="noopener noreferrer" class="media-lb-link">原链接</a>`);
    const infoHtml = infoParts.length ? `<div class="media-lb-info">${infoParts.join("")}</div>` : "";

    lbRoot.innerHTML = `
      <div class="media-lightbox">
        <button class="media-lb-close" data-action="close" aria-label="关闭">&times;</button>
        ${items.length > 1 ? '<button class="media-lb-btn lb-left" data-action="prev" aria-label="上一个">&#8249;</button>' : ""}
        <div class="media-lb-content">${mediaHtml}</div>
        ${items.length > 1 ? '<button class="media-lb-btn lb-right" data-action="next" aria-label="下一个">&#8250;</button>' : ""}
        ${infoHtml}
        ${counter}
      </div>`;

    const overlay = lbRoot.querySelector(".media-lightbox") as HTMLElement;
    if (!overlay) return;

    // Close on background click
    const onBgClick = (e: MouseEvent) => {
      // Only close if clicking the overlay itself or the content wrapper (not media)
      const target = e.target as HTMLElement;
      if (target === overlay || target.classList.contains("media-lb-content")) {
        closeLightbox();
      }
    };
    overlay.addEventListener("click", onBgClick);
    lbCleanups.push(() => overlay.removeEventListener("click", onBgClick));

    // Button actions
    const actions: Record<string, () => void> = {
      close: closeLightbox,
      prev: () => lbNav(-1),
      next: () => lbNav(1),
    };
    overlay.querySelectorAll("[data-action]").forEach((btn) => {
      const action = btn.getAttribute("data-action")!;
      const handler = (e: Event) => { e.stopPropagation(); actions[action]?.(); };
      btn.addEventListener("click", handler);
      lbCleanups.push(() => btn.removeEventListener("click", handler));
    });

    // Touch swipe on overlay
    let startX = 0;
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) lbNav(dx > 0 ? -1 : 1);
    };
    overlay.addEventListener("touchstart", onTouchStart, { passive: true });
    overlay.addEventListener("touchend", onTouchEnd, { passive: true });
    lbCleanups.push(() => {
      overlay.removeEventListener("touchstart", onTouchStart);
      overlay.removeEventListener("touchend", onTouchEnd);
    });
  });

  function escHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function openLightbox(items: LightboxItem[], index: number) {
    lbItems = items;
    lbIndex = index;
    lbOpen = true;
  }

  function closeLightbox() {
    lbOpen = false;
  }

  function lbNav(dir: number) {
    lbIndex = (lbIndex + dir + lbItems.length) % lbItems.length;
  }

  function onKeydown(e: KeyboardEvent) {
    if (!lbOpen) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") lbNav(-1);
    if (e.key === "ArrowRight") lbNav(1);
  }
</script>

<svelte:window onkeydown={onKeydown} />

<!-- Page header -->
<div class="mb-6">
  <div class="flex items-center gap-3 mb-3">
    <div
      class="h-8 w-8 rounded-lg bg-(--primary) flex items-center justify-center text-white dark:text-black/70"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </div>
    <div class="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
      媒体解析
    </div>
  </div>
  <p class="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
    粘贴链接，一键解析下载
  </p>
</div>

<!-- Tab navigation -->
<div class="flex gap-1 mb-6 border-b border-(--line-divider)">
  <button
    class="px-4 py-2.5 text-sm font-medium transition-colors duration-200 border-b-2 -mb-px {activeTab === 'parse' ? 'border-(--primary) text-(--primary)' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}"
    onclick={() => setTab("parse")}
  >
    解析
  </button>
  <button
    class="px-4 py-2.5 text-sm font-medium transition-colors duration-200 border-b-2 -mb-px {activeTab === 'files' ? 'border-(--primary) text-(--primary)' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}"
    onclick={() => setTab("files")}
  >
    文件库
  </button>
</div>

<!-- Tab content -->
{#if activeTab === "parse"}
  <ParseTab {openLightbox} />
{:else}
  <FileLibraryTab {openLightbox} />
{/if}
