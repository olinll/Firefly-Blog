export type FooterConfig = {
	enable: boolean; // 是否启用Footer HTML注入功能
	customHtml?: string; // 自定义HTML内容，用于添加备案号等信息
	icp?: { number: string; url: string }; // 工信部 ICP 备案
	policeRecord?: { number: string; url: string }; // 公安部公网安备
	status?: {
		// Uptime Kuma 业务状态指示器
		enabled: boolean;
		heartbeatUrl: string; // heartbeat API URL
		pageUrl: string; // 点击跳转的 status page URL
		upLabel: string; // 全部正常时显示的文字
		degradedLabel: string; // 部分异常时显示的文字
		downLabel: string; // 全部/无法访问时显示的文字
	};
};
