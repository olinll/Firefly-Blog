export interface ToolItem {
  title: string;
  description: string;
  href: string;
  icon: string;
}

export const toolsConfig: ToolItem[] = [
  {
    title: "媒体解析",
    description: "粘贴链接，一键解析下载视频/图片/音频",
    href: "/media/",
    icon: "material-symbols:play-circle-outline",
  },
  {
    title: "VLESS → Clash",
    description: "将 VLESS 订阅链接转换为 Clash 配置文件",
    href: "/sub/",
    icon: "material-symbols:vpn-key-outline",
  },
];
