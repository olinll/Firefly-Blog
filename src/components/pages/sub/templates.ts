const rawModules = import.meta.glob<string>("./templates/*.yaml.txt", {
  query: "?raw",
  import: "default",
  eager: true,
});

export interface ClashTemplate {
  id: string;
  name: string;
  content: string;
}

export const templates: ClashTemplate[] = Object.entries(rawModules).map(
  ([path, content]) => {
    const filename = path.split("/").pop()!.replace(".yaml.txt", "");
    return { id: filename, name: filename, content };
  }
);
