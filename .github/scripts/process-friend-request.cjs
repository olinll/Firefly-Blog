const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { URL } = require('node:url');

const FRIENDS_CONFIG_RELATIVE_PATH = 'src/config/friendsConfig.ts';

const DEFAULT_TAG = 'Blog';
const FORCE_PASS_COMMANDS = ['/approve', '/通过', '/强制通过'];
const REPO_OWNER_LOGIN = 'olinll';

function isRepoOwner(comment) {
	if (!comment) return false;
	if (comment.user?.login === REPO_OWNER_LOGIN) return true;
	return ['OWNER', 'MEMBER'].includes(comment.author_association);
}

function isForcePassCommand(body) {
	const text = (body || '').trim();
	return FORCE_PASS_COMMANDS.some((cmd) => text === cmd || text.startsWith(`${cmd} `) || text.startsWith(`${cmd}\n`));
}

function normalizeUrl(value) {
	if (!value) return '';
	try {
		return new URL(value.trim()).toString();
	} catch {
		return '';
	}
}

function trimTrailingSlash(value) {
	return value.replace(/\/$/, '');
}

const CHECK_USER_AGENT =
	'Mozilla/5.0 (compatible; Firefly-Blog-FriendLink/1.0; +https://blog.olinl.com)';
const CHECK_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, init = {}) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
	try {
		return await fetch(url, {
			...init,
			signal: controller.signal,
			headers: { 'User-Agent': CHECK_USER_AGENT, ...(init.headers || {}) },
		});
	} finally {
		clearTimeout(timer);
	}
}

async function checkSiteReachable(url) {
	try {
		const resp = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' });
		await resp.arrayBuffer().catch(() => {});
		if (resp.ok) return { ok: true, status: resp.status };
		return { ok: false, status: resp.status, error: `HTTP ${resp.status}` };
	} catch (e) {
		return { ok: false, status: 0, error: e?.message || String(e) };
	}
}

async function checkAvatarIsImage(url) {
	try {
		let resp = await fetchWithTimeout(url, { method: 'HEAD', redirect: 'follow' });
		if (resp.status === 405 || resp.status === 403) {
			resp = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' });
			await resp.arrayBuffer().catch(() => {});
		}
		const contentType = (resp.headers.get('content-type') || '').toLowerCase();
		const isImage = contentType.startsWith('image/');
		if (resp.ok && isImage) {
			return { ok: true, status: resp.status, contentType };
		}
		return { ok: false, status: resp.status, contentType, error: 'Content-Type 不是 image/*' };
	} catch (e) {
		return { ok: false, status: 0, contentType: '', error: e?.message || String(e) };
	}
}

function escapeString(value) {
	return String(value ?? '')
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"');
}

function parseIssueBody(body) {
	const data = {
		site_name: '',
		site_url: '',
		site_desc: '',
		site_avatar: '',
		site_tag: DEFAULT_TAG,
		qq: '',
	};

	const lines = body.split(/\r?\n/).map((line) => line.trim());
	let pendingField = null;

	const assignField = (field, value) => {
		if (!value) return;
		const trimmed = value.trim();
		if (!trimmed) return;
		switch (field) {
			case 'site_name':
				data.site_name = trimmed;
				break;
			case 'site_url':
				data.site_url = normalizeUrl(trimmed);
				break;
			case 'site_desc':
				data.site_desc = trimmed;
				break;
			case 'site_avatar':
				data.site_avatar = normalizeUrl(trimmed);
				break;
			case 'site_tag':
				data.site_tag = trimmed || DEFAULT_TAG;
				break;
			case 'qq':
				data.qq = trimmed;
				break;
		}
	};

	for (const line of lines) {
		if (!line) continue;

		// 匹配现有 Issue 模板的字段标题
		if (/^#+\s*(网站名称|名称|站点名称)/.test(line)) {
			pendingField = 'site_name';
			continue;
		}
		if (/^#+\s*(网站链接|站点链接|链接|网址|地址)/.test(line)) {
			pendingField = 'site_url';
			continue;
		}
		if (/^#+\s*(网站描述|描述|简介)/.test(line)) {
			pendingField = 'site_desc';
			continue;
		}
		if (/^#+\s*(网站头像|头像|图标|头像链接)/.test(line)) {
			pendingField = 'site_avatar';
			continue;
		}
		if (/^#+\s*(网站标签|标签|分类)/.test(line)) {
			pendingField = 'site_tag';
			continue;
		}
		if (/^#+\s*(QQ|qq)/.test(line)) {
			pendingField = 'qq';
			continue;
		}

		if (pendingField) {
			assignField(pendingField, line);
			pendingField = null;
			continue;
		}

		if (/[:：]/.test(line)) {
			const [key, ...rest] = line.split(/[:：]/);
			const value = rest.join(':').trim();
			if (!value) continue;

			if (/名称|标题/.test(key)) assignField('site_name', value);
			else if (/网站链接|站点链接|链接|网址|地址/.test(key)) assignField('site_url', value);
			else if (/描述|简介/.test(key)) assignField('site_desc', value);
			else if (/头像|图标/.test(key)) assignField('site_avatar', value);
			else if (/标签|分类/.test(key)) assignField('site_tag', value);
			else if (/^QQ(\s*号)?$/i.test(key.trim())) assignField('qq', value);
		}
	}

	return data;
}

function extractString(block, key) {
	// 匹配 key: "value" 或 key:\n\t\t"value"（支持换行后的字符串）
	const regex = new RegExp(`${key}:\\s*(?:\\n\\s*)?["']([^"']*?)["']`);
	const match = block.match(regex);
	return match ? match[1] : '';
}

function extractNumber(block, key, fallback = 0) {
	const match = block.match(new RegExp(`${key}:\s*(\d+)`));
	return match ? Number(match[1]) : fallback;
}

function extractBoolean(block, key, fallback = true) {
	const match = block.match(new RegExp(`${key}:\s*(true|false)`));
	return match ? match[1] === 'true' : fallback;
}

function extractTags(block) {
	const match = block.match(/tags:\s*\[([\s\S]*?)\]/);
	if (!match) return [DEFAULT_TAG];
	const tags = [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) => item[1]);
	return tags.length ? tags : [DEFAULT_TAG];
}

function parseFriendsConfig(content) {
	const listMatch = content.match(/export const friendsConfig: FriendLink\[\] = \[([\s\S]*?)\n\];/);
	if (!listMatch) {
		throw new Error('未找到 friendsConfig 数组，请检查 src/config/friendsConfig.ts 的格式。');
	}

	const friendBlocks = [...listMatch[1].matchAll(/\{([\s\S]*?)\n\t\},?/g)].map((item) => item[1]);
	return friendBlocks.map((block) => ({
		title: extractString(block, 'title'),
		imgurl: extractString(block, 'imgurl'),
		desc: extractString(block, 'desc'),
		siteurl: extractString(block, 'siteurl'),
		tags: extractTags(block),
		weight: extractNumber(block, 'weight', 5),
		enabled: extractBoolean(block, 'enabled', true),
		source: extractString(block, 'source') || undefined,
		qq: extractString(block, 'qq') || undefined,
	}));
}

function renderFriend(friend, indent) {
	const tags = (friend.tags && friend.tags.length ? friend.tags : [DEFAULT_TAG])
		.map((tag) => `"${escapeString(tag)}"`)
		.join(', ');

	const lines = [
		`${indent}{`,
		`${indent}\ttitle: "${escapeString(friend.title)}",`,
		`${indent}\timgurl: "${escapeString(friend.imgurl)}",`,
		`${indent}\tdesc: "${escapeString(friend.desc)}",`,
		`${indent}\tsiteurl: "${escapeString(friend.siteurl)}",`,
		`${indent}\ttags: [${tags}],`,
		`${indent}\tweight: ${Number.isFinite(friend.weight) ? friend.weight : 5},`,
		`${indent}\tenabled: ${friend.enabled !== false},`,
	];
	if (friend.source) {
		lines.push(`${indent}\tsource: "${escapeString(friend.source)}",`);
	}
	if (friend.qq) {
		lines.push(`${indent}\tqq: "${escapeString(friend.qq)}",`);
	}
	lines.push(`${indent}},`);
	return lines.join('\n');
}

function updateFriendsConfig(repoRoot, data) {
	const filePath = path.join(repoRoot, FRIENDS_CONFIG_RELATIVE_PATH);
	const content = fs.readFileSync(filePath, 'utf8');
	const eol = content.includes('\r\n') ? '\r\n' : '\n';
	const indentMatch = content.match(/\n(\s*)\{/);
	const indent = indentMatch ? indentMatch[1] : '\t';

	const friends = parseFriendsConfig(content);
	const normalizedUrl = trimTrailingSlash(data.site_url);

	const nextFriend = {
		title: data.site_name,
		imgurl: data.site_avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(data.site_name)}`,
		desc: data.site_desc || '',
		siteurl: data.site_url,
		tags: [data.site_tag || DEFAULT_TAG],
		weight: 5,
		enabled: true,
		source: data.source || undefined,
		qq: data.qq || undefined,
	};

	const existingIndex = friends.findIndex((friend) => trimTrailingSlash(friend.siteurl) === normalizedUrl);
	const previousFriend = existingIndex >= 0 ? { ...friends[existingIndex] } : null;
	if (existingIndex >= 0) {
		friends[existingIndex] = nextFriend;
	} else {
		friends.push(nextFriend);
	}

	const renderedFriends = friends
		.map((friend) => renderFriend(friend, indent))
		.join(eol);

	const updatedContent = content.replace(
		/export const friendsConfig: FriendLink\[\] = \[[\s\S]*?\n\];/,
		`export const friendsConfig: FriendLink[] = [${eol}${renderedFriends}${eol}];`
	);

	const changed = updatedContent !== content;
	if (changed) {
		fs.writeFileSync(filePath, updatedContent, 'utf8');
	}

	return {
		changed,
		filePath,
		friend: nextFriend,
		previous: previousFriend,
	};
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		shell: false,
		...options,
	});
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
	}
}

function formatFriendsConfig(repoRoot) {
	const biomeBinary = path.join(
		repoRoot,
		"node_modules",
		".bin",
		process.platform === "win32" ? "biome.cmd" : "biome"
	);
	if (!fs.existsSync(biomeBinary)) {
		throw new Error("未找到 Biome 可执行文件，无法格式化 friendsConfig.ts。");
	}
	run(biomeBinary, ["format", "--write", FRIENDS_CONFIG_RELATIVE_PATH], { cwd: repoRoot });
}

async function addLabels(github, owner, repo, issueNumber, labels) {
	if (!labels.length) return;
	await github.rest.issues.addLabels({
		owner,
		repo,
		issue_number: issueNumber,
		labels,
	});
}

async function removeLabelIfExists(github, owner, repo, issueNumber, label) {
	try {
		await github.rest.issues.removeLabel({
			owner,
			repo,
			issue_number: issueNumber,
			name: label,
		});
	} catch (error) {
		if (error.status !== 404) throw error;
	}
}

async function createComment(github, owner, repo, issueNumber, body) {
	await github.rest.issues.createComment({
		owner,
		repo,
		issue_number: issueNumber,
		body,
	});
}

function commitAndPush(repoRoot, defaultBranch, filePath, siteName, suffix = '') {
	run('git', ['config', 'user.name', 'github-actions[bot]'], { cwd: repoRoot });
	run('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com'], { cwd: repoRoot });
	run('git', ['add', filePath], { cwd: repoRoot });

	const hasChanges = spawnSync('git', ['diff', '--cached', '--quiet', '--', filePath], {
		cwd: repoRoot,
		shell: false,
	}).status !== 0;

	if (!hasChanges) {
		return false;
	}

	run('git', ['commit', '-m', `🤝 更新友链: ${siteName}${suffix}`], { cwd: repoRoot });
	run('git', ['pull', '--rebase', 'origin', defaultBranch], { cwd: repoRoot });
	run('git', ['push', 'origin', `HEAD:${defaultBranch}`], { cwd: repoRoot });
	return true;
}

function buildFriendDiffTable(previous, formData, fallbackImgurl) {
	const fields = [
		['名称', previous.title, formData.site_name],
		['链接', previous.siteurl, formData.site_url],
		['描述', previous.desc, formData.site_desc || '(空)'],
		['头像', previous.imgurl, formData.site_avatar || fallbackImgurl],
		['标签', previous.tags?.[0] || '(空)', formData.site_tag || DEFAULT_TAG],
		['QQ', previous.qq || '(无)', formData.qq || '(无)'],
	];
	const rows = fields.map(([label, oldV, newV]) => {
		const changed = oldV !== newV;
		const oldCell = changed ? `**${oldV}**` : oldV;
		const newCell = changed ? `**${newV}**` : newV;
		return `| ${label} | ${oldCell} | ${newCell} |`;
	});
	const changedCount = fields.filter(([, o, n]) => o !== n).length;
	return {
		table: `| 字段 | 原值 | 新值 |\n| --- | --- | --- |\n${rows.join('\n')}`,
		changedCount,
	};
}

module.exports = async function processFriendRequest({ github, context }) {
	const issue = context.payload.issue;
	if (!issue) {
		console.log('当前事件不包含 issue，跳过。');
		return;
	}

	const owner = context.repo.owner;
	const repo = context.repo.repo;
	const issueNumber = issue.number;
	const action = context.payload.action;
	const body = issue.body || '';
	const isCommentEvent = context.eventName === 'issue_comment';

	// 检测是否为友链申请（包含特定表单字段）
	const isFriendRequest = body.includes('### 网站名称') && body.includes('### 网站链接');
	const isFriendRequestAlt = body.includes('### 网站名称') && body.includes('### 头像链接');
	if (!isFriendRequest && !isFriendRequestAlt) {
		console.log('非友链申请 issue，跳过。');
		return;
	}

	try {
		let forcePass = false;
		if (isCommentEvent) {
			const comment = context.payload.comment;
			if (isRepoOwner(comment) && isForcePassCommand(comment?.body)) {
				forcePass = true;
				console.log(`博主 ${comment.user?.login} 触发强制通过`);
			} else {
				const isAuthor = comment?.user?.login === issue.user?.login;
				if (!isAuthor) {
					console.log('评论不是来自 issue 作者，也不是博主强制通过命令，跳过。');
					return;
				}
			}
		}

		const formData = parseIssueBody(body);

		if (!formData.site_name || !formData.site_url) {
			await createComment(
				github,
				owner,
				repo,
				issueNumber,
				'❌ 友链信息不完整，请确保填写了网站名称和网站链接。'
			);
			await addLabels(github, owner, repo, issueNumber, ['needs-update']);
			return;
		}

		if (!normalizeUrl(formData.site_url)) {
			await createComment(
				github,
				owner,
				repo,
				issueNumber,
				'❌ 网站链接不是有效的 URL，请检查后重新提交。'
			);
			await addLabels(github, owner, repo, issueNumber, ['needs-update']);
			return;
		}

		const warnings = [];
		const siteCheck = await checkSiteReachable(formData.site_url);
		if (!siteCheck.ok) {
			warnings.push(`- 网站链接无法访问：${formData.site_url}\n  - 状态: ${siteCheck.status || '无响应'}\n  - 错误: ${siteCheck.error || '未知'}`);
		}

		if (formData.site_avatar) {
			const avatarCheck = await checkAvatarIsImage(formData.site_avatar);
			if (!avatarCheck.ok) {
				warnings.push(`- 头像链接不可用：${formData.site_avatar}\n  - 状态: ${avatarCheck.status || '无响应'}\n  - Content-Type: ${avatarCheck.contentType || '无'}\n  - 错误: ${avatarCheck.error || '未知'}`);
			}
		}

		if (warnings.length > 0 && !forcePass) {
			await createComment(
				github,
				owner,
				repo,
				issueNumber,
				`❌ 友链信息校验未通过：

${warnings.map((w) => `- ${w}`).join('\n')}

请修正后回复本 Issue 重试，或由博主人工评论 \`/approve\` 强制通过。`
			);
			await addLabels(github, owner, repo, issueNumber, ['needs-update']);
			return;
		}

		const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();
		const updateResult = updateFriendsConfig(repoRoot, { ...formData, source: issue.html_url });
		formatFriendsConfig(repoRoot);

		const forcePassSuffix = forcePass && warnings.length > 0
			? ` [强制通过，忽略: ${warnings.length} 项校验]`
			: '';
		const committed = commitAndPush(
			repoRoot,
			context.payload.repository?.default_branch || 'master',
			FRIENDS_CONFIG_RELATIVE_PATH,
			formData.site_name,
			forcePassSuffix
		);

		const forcePassNote = forcePass && warnings.length > 0
			? `\n\n⚠️ **博主已强制通过**（忽略以下校验）：\n${warnings.map((w) => `- ${w}`).join('\n')}`
			: '';
		const isUpdate = !!updateResult.previous;
		const diffSection = isUpdate
			? (() => {
				const diff = buildFriendDiffTable(updateResult.previous, formData, updateResult.friend.imgurl);
				return `\n\n**变更详情**（${diff.changedCount} 个字段有变化）：\n${diff.table}`;
			})()
			: '';
		const actionWord = isUpdate ? '更新' : '添加';
		const commentBody = committed
			? `✅ 你的网站 **${formData.site_name}** (${formData.site_url}) 已成功**${actionWord}**到本站友链中。${forcePassNote}${diffSection}

**友链信息**：
- 名称: ${formData.site_name}
- 链接: ${formData.site_url}
- 描述: ${formData.site_desc || '无'}
- 头像: ${formData.site_avatar || updateResult.friend.imgurl}`
			: `✅ 友链信息已经是最新状态，无需重复提交。

**网站**：${formData.site_name}
**链接**：${formData.site_url}`;

		await createComment(github, owner, repo, issueNumber, commentBody);
		await removeLabelIfExists(github, owner, repo, issueNumber, 'needs-update');
		await github.rest.issues.update({
			owner,
			repo,
			issue_number: issueNumber,
			state: 'closed',
			state_reason: 'completed',
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(message);
		await createComment(
			github,
			owner,
			repo,
			issueNumber,
			`❌ 自动处理友链申请时出现异常：${message}

请检查 workflow 日志后重试。`
		);
		throw error;
	}
};
