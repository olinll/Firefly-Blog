import type { FooterConfig } from "../types/footerConfig";

export const footerConfig: FooterConfig = {
	// 是否启用Footer HTML注入功能
	enable: false,

	// 工信部 ICP 备案
	icp: {
		number: "苏ICP备2022020192号-1",
		url: "https://beian.miit.gov.cn/",
	},

	// 公安部公网安备
	policeRecord: {
		number: "苏公网安备32021302003009号",
		url: "https://beian.mps.gov.cn/web/beian/32021302003009",
	},

	// Uptime Kuma 业务状态指示器
	// 客户端 fetch heartbeatUrl,根据 monitor 状态自动切换文案和颜色
	status: {
		enabled: true,
		heartbeatUrl: "https://status.olinl.com/api/status-page/heartbeat/olinl",
		pageUrl: "https://status.olinl.com/status/olinl",
		upLabel: "所有业务正常",
		degradedLabel: "部分服务异常",
		downLabel: "所有服务异常",
	},
};

// 如需使用旧的 HTML 注入,直接将 enable 改为 true 并编辑 src/config/FooterConfig.html
