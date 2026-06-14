/**
 * 跳转映射表
 *
 * - key: 来源路径（站内），以 / 开头
 * - value: 目标地址
 *     - 以 / 开头 → 站内跳转
 *     - 以 http:// 或 https:// 开头 → 站外跳转
 *
 * 注意：本站为 static 输出模式，Astro 会为每个跳转项生成带
 * <meta http-equiv="refresh"> 的 HTML 占位页（浏览器跳转有效，
 * 但 HTTP 响应仍是 200）。如需真正的 HTTP 302，请在
 * EdgeOne / Vercel / Cloudflare 控制台另配跳转规则。
 *
 * 状态码：统一按 302（临时）处理，方便随时改目标。
 */
export const redirectsConfig: Record<string, string> = {
	// === 站内跳转示例 ===
	// "/old-blog/": "/posts/",
	// "/legacy/about/": "/about/",
	// === 站外跳转示例 ===
	// "/github/": "https://github.com/olinll",
	// "/short-url/": "https://example.com/very/long/path/",
	"/avatar": "https://q2.qlogo.cn/headimg_dl?dst_uin=9892214&spec=0",
};

/**
 * 把映射表转换为 Astro `redirects` 字段所需的对象格式（status 固定为 302）
 */
export function buildAstroRedirects(): Record<
	string,
	{ status: 302; destination: string }
> {
	return Object.fromEntries(
		Object.entries(redirectsConfig).map(([from, to]) => [
			from,
			{ status: 302, destination: to },
		]),
	);
}
