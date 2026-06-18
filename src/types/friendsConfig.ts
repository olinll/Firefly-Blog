// 友链配置
export type FriendLink = {
	title: string; // 友链标题
	imgurl: string; // 头像图片URL
	desc: string; // 友链描述
	siteurl: string; // 友链地址
	tags?: string[]; // 标签数组
	weight: number; // 权重，数字越大排序越靠前
	enabled: boolean; // 是否启用
	// 来源标识：
	// - GitHub Issue 申请：填 issue 的 html_url，如 https://github.com/owner/repo/issues/123
	// - QQ bot 申请（未来）：填自定义标识，如 qq:group:12345
	// - 手动添加：可省略
	source?: string;
	// 申请人 QQ（用于联系 / 邀请进群；不进 UI 展示，仅作为 metadata）
	qq?: string;
};

export type SiteInfo = {
	name: string;
	desc: string;
	url: string;
	avatar: string;
	email?: string;
};

export type FriendNote = {
	title: string;
	content: string;
};

export type FriendsPageConfig = {
	title?: string; // 页面标题，留空则使用 i18n 中的翻译
	description?: string; // 页面描述文本，如果留空则使用 i18n 中的翻译
	showCustomContent?: boolean; // 是否显示自定义内容（friends.mdx 中的内容）
	showComment?: boolean; // 是否显示评论区，默认 true
	randomizeSort?: boolean; // 是否打乱排序，如果为 true，将忽略 weight，随机排序
	applyLink?: string; // GitHub Issue 申请 URL
	siteInfo?: SiteInfo; // 本站信息，用于申请须知
	notes?: FriendNote[]; // 注意事项列表
};
