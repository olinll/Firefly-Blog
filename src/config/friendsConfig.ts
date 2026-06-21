import type { FriendLink, FriendsPageConfig } from "../types/friendsConfig";

// 可以在src/content/spec/friends.md中编写友链页面下方的自定义内容

// 友链页面配置
export const friendsPageConfig: FriendsPageConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 是否显示底部自定义内容（friends.mdx 中的内容）
	showCustomContent: true,

	// 是否显示评论区，需要先在commentConfig.ts启用评论系统
	showComment: true,

	// 是否开启随机排序配置，如果开启，就会忽略权重，构建时进行一次随机排序
	randomizeSort: false,

	// GitHub Issue 申请链接
	applyLink:
		"https://github.com/olinll/Firefly-Blog/issues/new?assignees=&labels=friend-link&projects=&template=friend-request.yml",

	// 本站信息（用于弹窗站点信息区块 + swap 模板）
	siteInfo: {
		name: "Olinl Blog",
		desc: "分享、实践、学习",
		url: "https://blog.olinl.com",
		avatar: "https://q2.qlogo.cn/headimg_dl?dst_uin=9892214&spec=0",
	},

	// 注意事项列表（用于弹窗注意事项区块）
	notes: [
		{ title: "友链互换", content: "申请前请先在你的网站添加本站友链。" },
		{
			title: "内容要求",
			content: "内容积极向上、合法合规，全球可访问，以原创内容为主。",
		},
	],
};

// 友链配置
export const friendsConfig: FriendLink[] = [
	{
		title: "夏夜流萤",
		imgurl:
			"https://weavatar.com/avatar/d252655d40d6874417a720bad0a6c5f77f8f6a1fd2f882f8f338402dc37e4190?s=640",
		desc: "飞萤之火自无梦的长夜亮起，绽放在终竟的明天。",
		siteurl: "https://blog.cuteleaf.cn",
		tags: ["Blog"],
		weight: 1, // 权重，数字越大排序越靠前
		enabled: true, // 是否启用
	},
	{
		title: "Firefly Docs",
		imgurl: "https://docs-firefly.cuteleaf.cn/logo.png",
		desc: "Firefly主题模板文档",
		siteurl: "https://docs-firefly.cuteleaf.cn",
		tags: ["Docs"],
		weight: 1,
		enabled: true,
	},
	{
		title: "Astro",
		imgurl: "https://avatars.githubusercontent.com/u/44914786?v=4&s=640",
		desc: "The web framework for content-driven websites. ⭐️ Star to support our work!",
		siteurl: "https://github.com/withastro/astro",
		tags: ["Docs"],
		weight: 1,
		enabled: true,
	},
	{
		title: "他说",
		imgurl: "https://090909.top/assets/images/logo.ico",
		desc: "梁栋烨的博客网站。",
		siteurl: "https://090909.top",
		tags: ["Blog"],
		weight: 100,
		enabled: true,
	},
	{
		title: "Hyper001’s Blog",
		imgurl: "https://blog.hyper001.cn/images/avatar.jpeg",
		desc: "记录学习，分享生活，保持热爱，奔赴山海。",
		siteurl: "https://blog.hyper001.cn",
		tags: ["Blog"],
		weight: 101,
		enabled: true,
	},
	{
		title: "小枫_QWQ的Blog",
		imgurl:
			"https://q.qlogo.cn/headimg_dl?dst_uin=1432777209&spec=640&img_type=jpg",
		desc: "欢迎来到小枫_QWQ的Blog！这是一个致力于分享前后端技术的博客。同时也分享一些闲聊碎语",
		siteurl: "https://blog.xiaofengqwq.com",
		tags: ["Blog"],
		weight: 102,
		enabled: true,
	},
	{
		title: "TT清沫uk",
		imgurl:
			"https://ts1.tc.mm.bing.net/th/id/OIP-C.6WsD9caLSNQFhJOi77soRAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
		desc: "TT清沫ukの博客",
		siteurl: "https://ttquk.netlify.app",
		tags: ["Blog"],
		weight: 103,
		enabled: true,
	},
	{
		title: "高新炀的小站",
		imgurl: "https://xinyang-gao.github.io/assets/avatar.webp",
		desc: "一个装着些稀奇古怪东西的个人小站，欢迎来逛逛~",
		siteurl: "https://xinyang-gao.github.io",
		tags: ["Blog"],
		weight: 104,
		enabled: true,
	},
	{
		title: "番茄主理人",
		imgurl: "https://q1.qlogo.cn/g?b=qq&nk=20447289&s=640",
		desc: "坐而言不如起而行.",
		siteurl: "https://fqzlr.com/",
		tags: ["Blog"],
		weight: 105,
		enabled: true,
	},
	{
		title: "MmzMing的知识库",
		imgurl: "https://i.stardots.io/784774835/StarDots-2026052116374135506.jpg",
		desc: "哈基米，南北绿豆",
		siteurl: "https://tblog.mmzhiku.xyz",
		tags: ["Blog"],
		weight: 106,
		enabled: true,
	},
	{
		title: "Hyde Blog",
		imgurl:
			"https://seasir.top/assets/avatar.avif",
		desc: "人心中的成见是一座大山",
		siteurl: "https://seasir.top/",
		tags: ["Blog"],
		weight: 1,
		enabled: true,
		source: "qq:9892214",
	},
];

// 获取启用的友链并进行排序
export const getEnabledFriends = (): FriendLink[] => {
	const friends = friendsConfig.filter((friend) => friend.enabled);

	if (friendsPageConfig.randomizeSort) {
		return friends.sort(() => Math.random() - 0.5);
	}

	return friends.sort((a, b) => b.weight - a.weight);
};
