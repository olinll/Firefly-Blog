<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { mediaConfig } from "@/config/mediaConfig";

  type LightboxItem = { url: string; type: "video" | "image"; title?: string; author?: string; platform?: string; original_url?: string };

  let { openLightbox }: { openLightbox: (items: LightboxItem[], index: number) => void } = $props();

  const API_BASE = mediaConfig.apiBase;

  interface FileItem {
    filename: string;
    relative_path: string;
    url: string;
    thumb?: string;
    size: number;
    width?: number;
    height?: number;
    title?: string;
    author?: string;
    platform?: string;
    type?: string;
    original_url?: string;
  }

  const API_ORIGIN = API_BASE.replace(/\/media\/?$/, "");

  function fileUrl(path: string) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${API_ORIGIN}${path}`;
    return `${API_BASE}/api/download/${path}`;
  }
  function thumbUrl(path?: string) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${API_ORIGIN}${path}`;
    return `${API_BASE}/api/thumb/${path}`;
  }

  let files = $state<FileItem[]>([]);
  let page = $state(1);
  let loading = $state(false);
  let hasMore = $state(true);
  let total = $state(0);
  let platform = $state("");
  let date = $state("");
  let platforms = $state<string[]>([]);
  let dates = $state<string[]>([]);

  let sentinel: HTMLDivElement | undefined;
  let observer: IntersectionObserver | undefined;
  let waterfallEl: HTMLDivElement | undefined;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadFiles();
        }
      },
      { rootMargin: "200px" }
    );
    if (sentinel) observer.observe(sentinel);
    loadFiles(true);

    window.addEventListener("resize", onResize);
  });

  onDestroy(() => {
    observer?.disconnect();
    window.removeEventListener("resize", onResize);
    if (resizeTimer) clearTimeout(resizeTimer);
  });

  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => layoutMasonry(), 150);
  }

  // Re-layout when files change
  $effect(() => {
    // Subscribe to files changes
    const _ = files.length;
    tick().then(() => layoutMasonry());
  });

  function getColCount(width: number): number {
    if (width < 420) return 1;
    if (width < 640) return 2;
    if (width < 1024) return 3;
    return 4;
  }

  function layoutMasonry() {
    if (!waterfallEl) return;
    const items = waterfallEl.querySelectorAll<HTMLElement>(".wf-item");
    if (!items.length) return;

    const containerWidth = waterfallEl.offsetWidth;
    const gap = 12; // 0.75rem
    const cols = getColCount(containerWidth);
    const itemWidth = (containerWidth - gap * (cols - 1)) / cols;

    const colHeights = new Array(cols).fill(0);

    for (const item of items) {
      // Find shortest column
      const minH = Math.min(...colHeights);
      const colIdx = colHeights.indexOf(minH);

      item.style.width = `${itemWidth}px`;
      item.style.left = `${colIdx * (itemWidth + gap)}px`;
      item.style.top = `${minH}px`;

      // Force reflow to get accurate height
      const h = item.offsetHeight;
      colHeights[colIdx] = minH + h + gap;
    }

    waterfallEl.style.height = `${Math.max(...colHeights)}px`;
  }

  async function loadFiles(reset = false) {
    if (loading) return;
    if (reset) {
      page = 1;
      hasMore = true;
      files = [];
    }
    if (!hasMore) return;

    loading = true;
    try {
      const resp = await fetch(
        `${API_BASE}/api/files?page=${page}&page_size=20&platform=${encodeURIComponent(platform)}&date=${encodeURIComponent(date)}`
      );
      const data = await resp.json();

      total = data.total || 0;

      if (data.platforms?.length && platforms.length === 0) {
        platforms = data.platforms;
      }
      if (data.dates?.length && dates.length === 0) {
        dates = data.dates;
      }

      if (!data.files?.length && page === 1) {
        files = [];
      } else {
        files = [...files, ...(data.files || [])];
      }

      hasMore = data.has_more;
      page++;
    } catch (e) {
      console.error("Failed to load files:", e);
    } finally {
      loading = false;
    }
  }

  function onFilterChange() {
    loadFiles(true);
  }

  function fmtSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  function getFileMeta(f: FileItem) {
    const ext = f.filename.split(".").pop()?.toLowerCase() || "";
    const isVideo = ["mp4", "mkv", "webm", "flv"].includes(ext);
    const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
    const parts = f.relative_path.split("/");
    return {
      ext, isVideo, isImage,
      platform: f.platform || parts[1] || "",
      date: parts[0] || "",
    };
  }

  function openFileLightbox(f: FileItem) {
    const { isVideo, isImage } = getFileMeta(f);
    if (isVideo || isImage) {
      openLightbox([{
        url: fileUrl(f.url),
        type: isVideo ? "video" : "image",
        title: f.title,
        author: f.author,
        platform: f.platform,
        original_url: f.original_url,
      }], 0);
    }
  }

  function onImgLoad() {
    // Re-layout after image loads since heights change
    layoutMasonry();
  }
</script>

<!-- Filter bar -->
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
  <h2 class="text-lg font-medium text-neutral-800 dark:text-neutral-200">
    已下载文件 <span class="text-sm font-normal text-neutral-400">({total} 个文件)</span>
  </h2>
  <div class="flex gap-2">
    <select
      bind:value={platform}
      onchange={onFilterChange}
      class="bg-(--card-bg) border border-(--line-divider) rounded px-3 py-1.5 text-sm"
    >
      <option value="">全部平台</option>
      {#each platforms as p}
        <option value={p}>{p}</option>
      {/each}
    </select>
    <select
      bind:value={date}
      onchange={onFilterChange}
      class="bg-(--card-bg) border border-(--line-divider) rounded px-3 py-1.5 text-sm"
    >
      <option value="">全部日期</option>
      {#each dates as d}
        <option value={d}>{d}</option>
      {/each}
    </select>
  </div>
</div>

<!-- Waterfall grid -->
{#if files.length}
  <div class="media-waterfall" bind:this={waterfallEl}>
    {#each files as f (f.relative_path + f.filename)}
      {@const { ext, isVideo, isImage, platform: plat, date: fileDate } = getFileMeta(f)}
      <div class="wf-item bg-(--card-bg) rounded-lg border border-(--line-divider) overflow-hidden hover:border-neutral-300 dark:hover:border-neutral-600 transition">
        <!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div
          class="relative cursor-pointer"
          role={isVideo || isImage ? "button" : undefined}
          tabindex={isVideo || isImage ? 0 : undefined}
          onclick={() => openFileLightbox(f)}
          onkeydown={(e) => { if (e.key === "Enter") openFileLightbox(f); }}
        >
          {#if isVideo}
            <div class="relative bg-gradient-to-br from-neutral-800 to-neutral-900" style="aspect-ratio: {f.width && f.height ? `${f.width}/${f.height}` : '16/9'}">
              {#if f.thumb}
                {@const tUrl = thumbUrl(f.thumb)}
                <img src={tUrl} alt="" class="w-full h-full object-cover" loading="lazy" onload={onImgLoad} onerror={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              {/if}
              <div class="absolute inset-0 flex items-center justify-center">
                <svg class="w-14 h-14 text-white/80 drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          {:else if isImage}
            <div style={f.width && f.height ? `aspect-ratio: ${f.width}/${f.height}` : undefined}>
              <img src={fileUrl(f.url)} alt="" class="w-full h-full object-cover" loading="lazy" onload={onImgLoad} onerror={(e) => { const img = e.target as HTMLImageElement; const fallback = thumbUrl(f.thumb); if (fallback && img.src !== fallback) img.src = fallback; }} />
            </div>
          {:else}
            <div class="w-full aspect-video bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 text-xs">
              {ext.toUpperCase()}
            </div>
          {/if}
          <span class="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">{plat}</span>
          {#if f.type}
            <span class="absolute top-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">{f.type === "slides" ? "图文" : "视频"}</span>
          {/if}
        </div>
        <div class="p-2.5">
          {#if f.title}
            <div class="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate mb-0.5" title={f.title}>{f.title}</div>
          {/if}
          {#if f.author}
            <div class="text-xs text-neutral-400 truncate mb-1">@{f.author}</div>
          {/if}
          <div class="flex items-center justify-between">
            <span class="text-xs text-neutral-400">{fmtSize(f.size)} · {fileDate}</span>
            <div class="flex items-center gap-2 flex-shrink-0">
              {#if f.original_url}
                <a href={f.original_url} target="_blank" rel="noopener noreferrer" class="text-neutral-400 hover:text-(--primary) text-xs" onclick={(e) => e.stopPropagation()}>原链</a>
              {/if}
              <a href={fileUrl(f.url)} download class="text-(--primary) hover:underline text-xs" onclick={(e) => e.stopPropagation()}>下载</a>
            </div>
          </div>
        </div>
      </div>
    {/each}
  </div>
{:else if !loading}
  <div class="text-center py-16 text-neutral-400">暂无文件</div>
{/if}

<!-- Loading -->
{#if loading}
  <div class="text-center py-8 text-neutral-400 text-sm">加载中...</div>
{/if}

<!-- Sentinel for infinite scroll -->
<div bind:this={sentinel} class="h-px"></div>
