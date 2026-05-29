<script lang="ts">
  import { templates } from "./templates";

  interface VlessParams {
    uuid: string;
    server: string;
    port: string;
    flow: string;
    network: string;
    public_key: string;
    short_id: string;
    servername: string;
    fingerprint: string;
    security: string;
    spx: string;
  }

  let selectedTemplateId = $state(templates[0]?.id || "");
  let selectedTemplate = $derived(templates.find((t) => t.id === selectedTemplateId) || templates[0]);

  let inputText = $state("");
  let configName = $state("");
  let error = $state("");
  let result = $state("");
  let parsed: VlessParams | null = $state(null);

  function parseVless(url: string): VlessParams {
    const cleaned = url.trim();
    if (!cleaned.startsWith("vless://")) {
      throw new Error("不是有效的 VLESS 链接（需以 vless:// 开头）");
    }
    const parsed = new URL(cleaned);
    const uuid = parsed.username;
    if (!uuid) throw new Error("无法解析 UUID");

    const sp = parsed.searchParams;
    return {
      uuid,
      server: parsed.hostname,
      port: parsed.port || "443",
      flow: sp.get("flow") || "xtls-rprx-vision",
      network: sp.get("type") || "tcp",
      public_key: sp.get("pbk") || "",
      short_id: sp.get("sid") || "",
      servername: sp.get("sni") || parsed.hostname,
      fingerprint: sp.get("fp") || "chrome",
      security: sp.get("security") || "reality",
      spx: sp.get("spx") || "",
    };
  }

  function generateYaml(params: VlessParams, name: string): string {
    let yaml = selectedTemplate.content;
    const replacements: Record<string, string> = {
      "{{name}}": name,
      "{{server}}": params.server,
      "{{port}}": params.port,
      "{{uuid}}": params.uuid,
      "{{flow}}": params.flow,
      "{{network}}": params.network,
      "{{public_key}}": params.public_key,
      "{{short_id}}": params.short_id,
      "{{servername}}": params.servername,
      "{{fingerprint}}": params.fingerprint,
    };
    for (const [key, val] of Object.entries(replacements)) {
      yaml = yaml.replaceAll(key, val);
    }
    return yaml;
  }

  function doConvert() {
    error = "";
    result = "";
    parsed = null;

    try {
      const params = parseVless(inputText);
      parsed = params;
      const name = configName.trim() || `vless-${params.server}`;
      result = generateYaml(params, name);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "解析失败";
    }
  }

  function doExport() {
    if (!result) return;
    const name = configName.trim() || `vless-${parsed?.server || "config"}`;
    const blob = new Blob([result], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<!-- Header -->
<div class="mb-6">
  <div class="flex items-center gap-3 mb-2">
    <div class="h-8 w-8 rounded-lg bg-(--primary) flex items-center justify-center text-white dark:text-black/70">
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    </div>
    <div class="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
      VLESS &rarr; Clash
    </div>
  </div>
  <p class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
    适用于 3x-ui 面板的 VLESS 链接，纯前端解析，无外部依赖。粘贴链接、选择模板、导出配置即可导入 Clash 使用。
  </p>
</div>

<!-- Input card -->
<div class="bg-(--card-bg) rounded-xl border border-(--line-divider) p-5 mb-5">
  <!-- Row 1: template + name -->
  <div class="flex flex-col sm:flex-row gap-3 mb-4">
    <div class="flex items-center gap-2">
      <label class="text-xs text-neutral-400 flex-shrink-0">模板</label>
      <select
        bind:value={selectedTemplateId}
        class="bg-neutral-50 dark:bg-neutral-800 border border-(--line-divider) rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-(--primary) transition-all"
      >
        {#each templates as t}
          <option value={t.id}>{t.name}</option>
        {/each}
      </select>
    </div>
    <div class="flex items-center gap-2 flex-1">
      <label class="text-xs text-neutral-400 flex-shrink-0">名称</label>
      <input
        bind:value={configName}
        placeholder="可选，默认取服务器域名"
        class="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-(--line-divider) rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-(--primary) placeholder-neutral-400 transition-all"
      />
    </div>
  </div>
  <!-- Row 2: textarea -->
  <textarea
    bind:value={inputText}
    placeholder="vless://UUID@HOST:PORT?encryption=none&flow=xtls-rprx-vision&fp=chrome&pbk=...&security=reality&sid=...&sni=...&type=tcp#NAME"
    rows="3"
    class="w-full bg-neutral-50 dark:bg-neutral-800 border border-(--line-divider) rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-(--primary) placeholder-neutral-400 resize-y leading-normal transition-all mb-4"
  ></textarea>
  <!-- Row 3: button -->
  <div class="flex justify-end">
    <button
      onclick={doConvert}
      class="px-8 py-2.5 rounded-xl text-sm font-medium transition-all bg-(--primary) text-white hover:opacity-90 active:scale-95"
    >
      转换
    </button>
  </div>
</div>

<!-- Error -->
{#if error}
  <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-5 text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
    <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    {error}
  </div>
{/if}

<!-- Parsed info -->
{#if parsed}
  <div class="bg-(--card-bg) rounded-xl border border-(--line-divider) p-5 mb-5">
    <h3 class="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
      <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      解析结果
    </h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
      <div class="flex items-baseline gap-2">
        <span class="text-neutral-400 w-12 flex-shrink-0 text-right">服务器</span>
        <span class="text-neutral-700 dark:text-neutral-200 break-all">{parsed.server}:{parsed.port}</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-neutral-400 w-12 flex-shrink-0 text-right">SNI</span>
        <span class="text-neutral-700 dark:text-neutral-200">{parsed.servername}</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-neutral-400 w-12 flex-shrink-0 text-right">传输</span>
        <span class="text-neutral-700 dark:text-neutral-200">{parsed.network} / {parsed.security}</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-neutral-400 w-12 flex-shrink-0 text-right">Flow</span>
        <span class="text-neutral-700 dark:text-neutral-200">{parsed.flow}</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-neutral-400 w-12 flex-shrink-0 text-right">指纹</span>
        <span class="text-neutral-700 dark:text-neutral-200">{parsed.fingerprint}</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-neutral-400 w-12 flex-shrink-0 text-right">UUID</span>
        <span class="text-neutral-700 dark:text-neutral-200 break-all font-mono text-[11px]">{parsed.uuid}</span>
      </div>
    </div>
  </div>
{/if}

<!-- Result preview -->
{#if result}
  <div class="bg-(--card-bg) rounded-xl border border-(--line-divider) overflow-hidden">
    <div class="flex items-center justify-between px-5 py-3 border-b border-(--line-divider)">
      <h3 class="text-sm font-medium text-neutral-700 dark:text-neutral-300">配置预览</h3>
      <button
        onclick={doExport}
        class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all bg-(--primary) text-white hover:opacity-90 active:scale-95"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        导出
      </button>
    </div>
    <pre class="p-5 text-xs overflow-x-auto text-neutral-600 dark:text-neutral-400 leading-relaxed max-h-[50vh] overflow-y-auto">{result}</pre>
  </div>
{/if}
