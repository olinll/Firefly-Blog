<script lang="ts">
  import { mediaConfig } from "@/config/mediaConfig";

  type LightboxItem = { url: string; type: "video" | "image"; title?: string; author?: string; platform?: string; original_url?: string };

  let { openLightbox }: { openLightbox: (items: LightboxItem[], index: number) => void } = $props();

  const API_BASE = mediaConfig.apiBase;

  interface MediaFile {
    type: "video" | "image";
    filename: string;
    relative_path: string;
    url: string;
    thumb?: string;
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

  interface ParseResult {
    success: boolean;
    platform: string;
    title: string;
    author: string;
    type: "slides" | "video";
    duration: number;
    original_url: string;
    resolved_url: string;
    cached?: boolean;
    client_ip?: string;
    files: MediaFile[];
    error?: string;
    url?: string;
  }

  let inputText = $state("");
  let loading = $state(false);
  let error = $state("");
  let singleResult = $state<ParseResult | null>(null);
  let batchResults = $state<ParseResult[]>([]);
  let isBatch = $state(false);
  let showTips = $state(true);

  async function pasteInput() {
    try {
      const text = await navigator.clipboard.readText();
      inputText = text;
    } catch {
      alert("无法读取剪贴板，请手动粘贴");
    }
  }

  async function doParse() {
    const raw = inputText.trim();
    if (!raw) return;

    loading = true;
    error = "";
    singleResult = null;
    batchResults = [];
    showTips = false;

    try {
      const lines = raw.split("\n").filter((l) => l.trim());
      const endpoint = lines.length > 1 ? `${API_BASE}/api/batch-parse` : `${API_BASE}/api/parse`;
      const body = lines.length > 1 ? JSON.stringify({ text: raw }) : JSON.stringify({ text: lines[0] });

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "解析失败");

      if (lines.length > 1) {
        isBatch = true;
        batchResults = data.results || [];
      } else {
        isBatch = false;
        singleResult = data;
      }
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "解析失败";
      showTips = true;
    } finally {
      loading = false;
    }
  }

  function downloadAll() {
    const links = document.querySelectorAll("#media-file-list a[download]");
    links.forEach((a, i) => setTimeout(() => (a as HTMLAnchorElement).click(), i * 300));
  }

  function fmtDuration(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function openLbForFiles(files: MediaFile[], index: number, meta?: { title?: string; author?: string; platform?: string; original_url?: string }) {
    openLightbox(
      files.map((f) => ({ url: fileUrl(f.url), type: f.type, ...meta })),
      index
    );
  }
</script>

<!-- Platform badges -->
<div class="flex flex-wrap gap-2 mb-4">
  {#each [["抖音", "bg-pink-400"], ["B站", "bg-sky-400"], ["小红书", "bg-red-400"], ["TikTok", "bg-gray-800"], ["YouTube", "bg-red-500"], ["Twitter", "bg-blue-400"]] as [name, color]}
    <span class="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 bg-(--btn-regular-bg) px-2.5 py-1 rounded-full border border-(--line-divider)">
      <span class="w-1.5 h-1.5 rounded-full {color}"></span>{name}
    </span>
  {/each}
</div>

<!-- Input area -->
<div class="media-input-area flex gap-3 mb-4">
  <textarea
    bind:value={inputText}
    placeholder="粘贴链接或分享文案，支持多行批量解析..."
    rows="2"
    class="flex-1 bg-(--card-bg) border border-(--line-divider) rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-(--primary) placeholder-neutral-400 resize-y leading-normal transition-all"
  ></textarea>
  <div class="flex flex-col gap-2" style="min-width: 90px;">
    <button
      onclick={pasteInput}
      class="flex-1 btn-regular rounded-xl text-sm transition-all"
    >
      粘贴
    </button>
    <button
      onclick={doParse}
      disabled={loading}
      class="flex-1 rounded-xl text-sm font-medium transition-all bg-(--primary) text-white hover:opacity-90 disabled:opacity-50"
    >
      解析
    </button>
  </div>
</div>

<!-- Tips -->
{#if showTips}
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
    <div class="bg-(--card-bg) rounded-lg border border-(--line-divider) p-3 flex gap-3 items-start">
      <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      </div>
      <div>
        <div class="text-sm font-medium text-neutral-700 dark:text-neutral-300">粘贴分享文案</div>
        <div class="text-xs text-neutral-400 mt-0.5">直接粘贴 App 内复制的分享文字即可</div>
      </div>
    </div>
    <div class="bg-(--card-bg) rounded-lg border border-(--line-divider) p-3 flex gap-3 items-start">
      <div class="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
      </div>
      <div>
        <div class="text-sm font-medium text-neutral-700 dark:text-neutral-300">支持短链接</div>
        <div class="text-xs text-neutral-400 mt-0.5">v.douyin.com、b23.tv 等短链会自动跳转</div>
      </div>
    </div>
    <div class="bg-(--card-bg) rounded-lg border border-(--line-divider) p-3 flex gap-3 items-start">
      <div class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      </div>
      <div>
        <div class="text-sm font-medium text-neutral-700 dark:text-neutral-300">视频 & 图文</div>
        <div class="text-xs text-neutral-400 mt-0.5">自动识别类型，图集支持一键批量下载</div>
      </div>
    </div>
  </div>
{/if}

<!-- Loading -->
{#if loading}
  <div class="text-center py-12 text-neutral-500">
    <svg class="animate-spin h-8 w-8 mx-auto mb-3 text-(--primary)" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
    解析中...
  </div>
{/if}

<!-- Error -->
{#if error}
  <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 text-red-600 dark:text-red-400 text-sm">
    {error}
  </div>
{/if}

<!-- Single result -->
{#if singleResult && !isBatch}
  <div class="bg-(--card-bg) rounded-xl border border-(--line-divider) overflow-hidden mb-6">
    <div class="p-5">
      <div class="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
        <span class="bg-(--primary)/10 text-(--primary) text-xs px-2 py-1 rounded font-medium">{singleResult.platform}</span>
        <span class="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs px-2 py-1 rounded">{singleResult.type === "slides" ? "图文" : "视频"}</span>
        {#if singleResult.cached}
          <span class="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs px-2 py-1 rounded font-medium">缓存</span>
        {/if}
      </div>
      <h2 class="text-lg font-medium mb-1 text-neutral-900 dark:text-neutral-100">{singleResult.title || "(无标题)"}</h2>
      <p class="text-sm text-neutral-500">
        {singleResult.author ? `@${singleResult.author}` : ""}
        {singleResult.duration ? ` · 时长: ${fmtDuration(singleResult.duration)}` : ""}
      </p>
      <p class="text-xs text-neutral-400 mt-2">
        原链接: <a href={singleResult.resolved_url || singleResult.original_url || "#"} target="_blank" rel="noopener noreferrer" class="text-(--primary) hover:underline break-all">{singleResult.resolved_url || singleResult.original_url || ""}</a>
      </p>
      {#if singleResult.client_ip}
        <p class="text-xs text-neutral-400 mt-1">IP: <span class="text-neutral-500">{singleResult.client_ip}</span></p>
      {/if}
    </div>

    <!-- Media preview -->
    {#if singleResult.files?.length}
      {@const videos = singleResult.files.filter((f) => f.type === "video")}
      {@const images = singleResult.files.filter((f) => f.type === "image")}

      <div class="border-t border-(--line-divider)">
        {#each videos as f, i}
          <!-- svelte-ignore a11y_media_has_caption -->
          <video controls playsinline class="w-full max-h-[60vh] bg-black cursor-pointer" preload="metadata" onclick={() => openLbForFiles(singleResult!.files, singleResult!.files.indexOf(f), { title: singleResult!.title, author: singleResult!.author, platform: singleResult!.platform, original_url: singleResult!.original_url || singleResult!.resolved_url })}>
            <source src={fileUrl(f.url)} type="video/mp4" />
          </video>
        {/each}

        {#if images.length}
          <div class="grid gap-1 p-1 {images.length === 1 ? '' : images.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}">
            {#each images as f}
              {@const idx = singleResult.files.indexOf(f)}
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
              <img
                src={f.thumb ? thumbUrl(f.thumb) : fileUrl(f.url)}
                alt=""
                class="w-full aspect-square object-cover rounded cursor-pointer hover:opacity-80 transition"
                onclick={() => openLbForFiles(singleResult!.files, idx, { title: singleResult!.title, author: singleResult!.author, platform: singleResult!.platform, original_url: singleResult!.original_url || singleResult!.resolved_url })}
                onerror={(e) => { const img = e.target as HTMLImageElement; const fallback = fileUrl(f.url); if (img.src !== fallback) img.src = fallback; }}
              />
            {/each}
          </div>
          {#if images.length > 1}
            <div class="px-1 pb-2">
              <button onclick={downloadAll} class="w-full bg-(--primary) hover:opacity-90 text-white py-2.5 rounded-lg text-sm font-medium transition">
                一键下载全部 ({images.length} 张)
              </button>
            </div>
          {/if}
        {/if}
      </div>

      <!-- File list -->
      <div id="media-file-list" class="border-t border-(--line-divider) p-5">
        <h3 class="text-sm font-medium text-neutral-500 mb-3">文件</h3>
        {#each singleResult.files as f}
          <div class="flex items-center justify-between py-2 border-b border-(--line-divider) gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xs px-1.5 py-0.5 rounded flex-shrink-0 {f.type === 'video' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'}">{f.type === "video" ? "视频" : "图片"}</span>
              <span class="text-sm text-neutral-700 dark:text-neutral-300 truncate">{f.filename}</span>
            </div>
            <a href={fileUrl(f.url)} download class="text-(--primary) hover:underline text-sm flex-shrink-0">下载</a>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<!-- Batch result -->
{#if isBatch && batchResults.length}
  {@const successCount = batchResults.filter((r) => r.success).length}
  {@const failCount = batchResults.filter((r) => !r.success).length}
  <div class="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 mb-3 text-sm text-neutral-600 dark:text-neutral-400">
    成功: {successCount} 个，失败: {failCount} 个
  </div>

  {#each batchResults as result, idx}
    <div class="bg-(--card-bg) rounded-lg border border-(--line-divider) overflow-hidden mb-3">
      {#if result.success}
        {@const files = result.files || []}
        {@const videos = files.filter((f) => f.type === "video")}
        {@const images = files.filter((f) => f.type === "image")}
        <details>
          <summary class="p-3 cursor-pointer flex items-center justify-between list-none">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="bg-(--primary)/10 text-(--primary) text-xs px-2 py-0.5 rounded font-medium">{result.platform}</span>
                <span class="text-xs text-neutral-400">{result.type === "slides" ? "图文" : "视频"}</span>
                {#if result.cached}<span class="text-xs text-green-500">缓存</span>{/if}
              </div>
              <div class="text-sm font-medium text-neutral-800 dark:text-neutral-200">{result.title || "(无标题)"}</div>
              <div class="text-xs text-neutral-400">{result.author ? `@${result.author}` : ""}</div>
            </div>
            <svg class="w-4 h-4 text-neutral-400 transition-transform open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </summary>
          <div>
            {#if videos.length || images.length}
              <div class="border-t border-(--line-divider)">
                {#each videos as f}
                  <!-- svelte-ignore a11y_media_has_caption -->
                  <video controls playsinline class="w-full max-h-48 bg-black" preload="metadata">
                    <source src={fileUrl(f.url)} type="video/mp4" />
                  </video>
                {/each}
                {#if images.length}
                  <div class="grid gap-1 p-1 {images.length === 1 ? '' : images.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}">
                    {#each images as f}
                      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
                      <img src={f.thumb ? thumbUrl(f.thumb) : fileUrl(f.url)} alt="" class="w-full aspect-square object-cover rounded cursor-pointer hover:opacity-80 transition" onclick={() => openLbForFiles(files, files.indexOf(f), { title: result.title, author: result.author, platform: result.platform, original_url: result.original_url || result.resolved_url })} onerror={(e) => { const img = e.target as HTMLImageElement; const fallback = fileUrl(f.url); if (img.src !== fallback) img.src = fallback; }} />
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
            <div class="p-3 border-t border-(--line-divider) flex flex-wrap gap-2">
              {#each files as f}
                <a href={fileUrl(f.url)} download class="text-(--primary) hover:underline text-xs bg-(--primary)/10 px-2 py-1 rounded">{f.type === "video" ? "视频" : "图片"} 下载</a>
              {/each}
            </div>
          </div>
        </details>
      {:else}
        <div class="p-4">
          <div class="flex items-center gap-2 mb-1">
            <span class="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded">失败</span>
          </div>
          <div class="text-sm text-neutral-600 dark:text-neutral-400 truncate">{result.url || ""}</div>
          <div class="text-xs text-red-500 mt-1">{result.error || "未知错误"}</div>
        </div>
      {/if}
    </div>
  {/each}
{/if}
