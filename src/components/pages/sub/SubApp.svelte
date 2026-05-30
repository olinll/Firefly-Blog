<script lang="ts">
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
    alpn: string;
    host: string;
    path: string;
    fragment: string;
    xhttpMode: string;
  }

  let inputText = $state("");
  let nodeName = $state("");
  let fileName = $state("");
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
      flow: sp.get("flow") || "",
      network: sp.get("type") || "tcp",
      public_key: sp.get("pbk") || "",
      short_id: sp.get("sid") || "",
      servername: sp.get("sni") || parsed.hostname,
      fingerprint: sp.get("fp") || "chrome",
      security: sp.get("security") || "",
      spx: sp.get("spx") || "",
      alpn: sp.get("alpn") || "",
      host: sp.get("host") || "",
      path: sp.get("path") || "",
      fragment: decodeURIComponent(parsed.hash.slice(1)) || "",
      xhttpMode: sp.get("mode") || "auto",
    };
  }

  function buildProxy(p: VlessParams, name: string): string {
    const lines: string[] = [];
    lines.push(`- name: ${name}`);
    lines.push(`  type: vless`);
    lines.push(`  udp: true`);
    lines.push(`  server: ${p.server}`);
    lines.push(`  port: ${p.port}`);
    lines.push(`  uuid: ${p.uuid}`);
    lines.push(`  encryption: none`);

    if (p.flow) {
      lines.push(`  flow: ${p.flow}`);
    }

    lines.push(`  network: ${p.network}`);

    // TLS / Reality
    if (p.security === "reality") {
      lines.push(`  tls: true`);
      lines.push(`  reality-opts:`);
      lines.push(`    public-key: ${p.public_key}`);
      lines.push(`    short-id: ${p.short_id}`);
    } else {
      lines.push(`  tls: true`);
      if (p.alpn) {
        lines.push(`  tlssettings:`);
        lines.push(`    alpn:`);
        for (const a of p.alpn.split(",")) {
          lines.push(`      - ${a.trim()}`);
        }
      }
    }

    lines.push(`  servername: ${p.servername}`);
    lines.push(`  client-fingerprint: ${p.fingerprint}`);

    // Transport-specific options
    if (p.network === "xhttp") {
      lines.push(`  xhttp-opts:`);
      lines.push(`    mode: ${p.xhttpMode}`);
      lines.push(`    path: ${p.path || p.spx || "/"}`);
    } else if (p.network === "ws") {
      lines.push(`  ws-opts:`);
      lines.push(`    path: ${p.path || "/"}`);
      if (p.host) {
        lines.push(`    headers:`);
        lines.push(`      Host: ${p.host}`);
      }
    }

    return lines.join("\n");
  }

  function generateYaml(p: VlessParams, name: string): string {
    const proxy = buildProxy(p, name);
    return `port: 7890
socks-port: 7891
allow-lan: false
mode: Rule
log-level: info
external-controller: 127.0.0.1:9090

proxies:
${proxy}

proxy-groups:
- name: "🚀 节点选择"
  type: select
  proxies:
  - "♻️ 自动选择"
  - "🎯 全球直连"
  - ${name}

- name: "♻️ 自动选择"
  type: url-test
  proxies:
  - ${name}
  url: http://www.gstatic.com/generate_204
  interval: 300

- name: "🎯 全球直连"
  type: select
  proxies:
  - DIRECT

rules:
  - DOMAIN,${p.server},DIRECT
  - DOMAIN-SUFFIX,local,DIRECT
  - IP-CIDR,127.0.0.0/8,DIRECT
  - IP-CIDR,172.16.0.0/12,DIRECT
  - IP-CIDR,192.168.0.0/16,DIRECT
  - IP-CIDR,10.0.0.0/8,DIRECT
  - IP-CIDR,100.64.0.0/10,DIRECT
  - GEOIP,CN,DIRECT
  - MATCH,🚀 节点选择`;
  }

  function doConvert() {
    error = "";
    result = "";
    parsed = null;

    try {
      const params = parseVless(inputText);
      parsed = params;
      nodeName = params.fragment || `vless-${params.server}`;
      fileName = nodeName;
      const name = nodeName.trim() || `vless-${params.server}`;
      result = generateYaml(params, name);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "解析失败";
    }
  }

  function doExport() {
    if (!result) return;
    const name = fileName.trim() || nodeName.trim() || `vless-${parsed?.server || "config"}`;
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
    适用于 3x-ui 面板的 VLESS 链接，纯前端解析，无外部依赖。支持 Reality、WS+TLS、xhttp 等传输方式。
  </p>
</div>

<!-- Input card -->
<div class="bg-(--card-bg) rounded-xl border border-(--line-divider) p-5 mb-5">
  <!-- Row 1: node name + filename -->
  <div class="flex flex-col sm:flex-row gap-3 mb-4">
    <div class="flex items-center gap-2 flex-1">
      <label class="text-xs text-neutral-400 flex-shrink-0">节点名称</label>
      <input
        bind:value={nodeName}
        placeholder="解析后自动填入，可修改"
        class="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-(--line-divider) rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-(--primary) placeholder-neutral-400 transition-all"
      />
    </div>
    <div class="flex items-center gap-2 flex-1">
      <label class="text-xs text-neutral-400 flex-shrink-0">文件名</label>
      <input
        bind:value={fileName}
        placeholder="默认同节点名称"
        class="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-(--line-divider) rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-(--primary) placeholder-neutral-400 transition-all"
      />
    </div>
  </div>
  <!-- Row 2: textarea -->
  <textarea
    bind:value={inputText}
    placeholder="vless://UUID@HOST:PORT?encryption=none&fp=chrome&security=reality&type=xhttp#NAME"
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
      {#if parsed.flow}
        <div class="flex items-baseline gap-2">
          <span class="text-neutral-400 w-12 flex-shrink-0 text-right">Flow</span>
          <span class="text-neutral-700 dark:text-neutral-200">{parsed.flow}</span>
        </div>
      {/if}
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
