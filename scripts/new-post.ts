#!/usr/bin/env node

import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { confirm, intro, isCancel, log, outro, select, text } from "@clack/prompts";
import dayjs from "dayjs";

function normalize<T>(val: T | symbol): T | undefined {
	if (isCancel(val)) process.exit(0);
	return val as T;
}

function validateSlug(val: string | undefined): string | undefined {
	const v = val?.trim();
	if (!v) return "文件名不能为空";
	if (!/^[a-z0-9-_]+$/.test(v))
		return "只允许小写字母、数字、-、_（如 my-first-post）";
	return undefined;
}

const SLUG_FROM_CLI = process.argv[2]?.trim();
const DATE_STR = dayjs().format("YYYY-MM-DD HH:mm:ss");
const POSTS_ROOT = "src/content/posts";

intro(SLUG_FROM_CLI ? "📝 新建文章（CLI 模式）" : "📝 新建文章（交互模式）");

// 1. slug：CLI 提供则跳过
let slug = SLUG_FROM_CLI;
if (!slug) {
	slug = normalize(
		await text({
			message: "请输入文件名（slug，URL 路径的一部分）",
			placeholder: "my-first-post",
			validate: validateSlug,
		}),
	);
}
if (!slug) process.exit(0);
log.info(`slug: ${slug}`);

const postDir = path.join(POSTS_ROOT, slug);
const mdPath = path.join(postDir, "index.md");
const imagesDir = path.join(postDir, "images");

if (fs.existsSync(mdPath)) {
	log.error(`❌ 文件已存在: ${mdPath}`);
	process.exit(1);
}

// 2. title：默认 = slug
const title = normalize(
	await text({
		message: "请输入文章标题",
		placeholder: slug,
		defaultValue: slug,
		validate: (v) => (v?.trim() === "" ? "标题不能为空" : undefined),
	}),
);
if (!title) process.exit(0);

// 3. category（必填）
const category = normalize(
	await text({
		message: "请输入分类（单个）",
		placeholder: "tech",
		validate: (v) => (v?.trim() === "" ? "分类不能为空" : undefined),
	}),
);
if (!category) process.exit(0);

// 4. tags（可选，逗号/空格分隔）
const tagsInput = normalize(
	await text({
		message: "请输入标签（多个用中英文逗号或空格分隔，留空跳过）",
		placeholder: "Vue, Vite, TypeScript",
	}),
);
const tags =
	tagsInput
		?.split(/[\s,，]+/)
		.map((t) => t.trim())
		.filter(Boolean) ?? [];

// 5. image：默认 api
const image = normalize(
	await select({
		message: "选择封面图",
		initialValue: "api",
		options: [
			{ value: "api", label: "随机封面（coverImageConfig 配的 3 个 API）" },
			{ value: "", label: "不设封面（留空）" },
			{ value: "__custom__", label: "自定义相对路径（如 cover.avif / images/foo.png）" },
		],
	}),
);
if (image === undefined) process.exit(0);
let imageValue = image;
if (image === "__custom__") {
	const customImage = normalize(
		await text({
			message: "请输入封面相对路径（相对于文章目录）",
			placeholder: "cover.avif",
			validate: (v) => (v?.trim() === "" ? "路径不能为空" : undefined),
		}),
	);
	if (!customImage) process.exit(0);
	imageValue = customImage;
}

// 6. draft：默认 true
const draft = normalize(
	await confirm({
		message: "是否存为草稿？",
		initialValue: true,
	}),
);
if (draft === undefined) process.exit(0);

// 7. description：自动模板，可手动覆盖
const autoDescription = tags.length > 0
	? `关于 ${title} 的笔记，涉及 ${tags.join("、")}。`
	: `关于 ${title} 的笔记。`;
const description = normalize(
	await text({
		message: "文章描述（Enter 用自动模板）",
		placeholder: autoDescription,
		defaultValue: autoDescription,
	}),
);
if (description === undefined) process.exit(0);

// 创建目录
fs.mkdirSync(postDir, { recursive: true });
fs.mkdirSync(imagesDir, { recursive: true });

// 写 frontmatter
const tagsYaml = tags.length > 0 ? `[${tags.join(", ")}]` : "[]";
const imageYaml = imageValue === "" ? '""' : imageValue;

const frontmatter = [
	`title: ${title}`,
	`slug: ${slug}`,
	`published: ${DATE_STR}`,
	`updated: ${DATE_STR}`,
	`description: ${description}`,
	`image: ${imageYaml}`,
	`category: ${category}`,
	`tags: ${tagsYaml}`,
	`draft: ${draft}`,
	`# pinned: false                                  # 置顶`,
	// `# author: ""                                    # 作者，留空用 profileConfig.name`,
	// `# sourceLink: ""                                # 原文链接（转载用）`,
	// `# licenseName: ""                               # 许可证名`,
	// `# licenseUrl: ""                                # 许可证 URL`,
	// `# comment: true                                 # 是否开启评论`,
	// `# password: ""                                  # 加密密码（设了之后需要密码才能看）`,
	// `# passwordHint: ""                              # 密码提示`,
	"",
].join("\n");

const content = `---\n${frontmatter}\n---\n\n`;

fs.writeFileSync(mdPath, content, "utf8");
log.success(`✅ 已创建: ${path.resolve(mdPath)}`);
log.info(`📁 目录: ${path.resolve(postDir)}`);
log.info(`🖼  图片目录: ${path.resolve(imagesDir)}`);

// 尝试打开 VS Code（失败不致命）
exec(`code "${mdPath}"`, (err) => {
	if (err) {
		log.warn("⚠️ 无法打开 VS Code（已创建文件，可手动打开）");
	}
});

outro("🎉 开始书写吧！");
