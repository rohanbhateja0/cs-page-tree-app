export type CmsEntry = {
  uid: string;
  title?: string;
  url?: string;
  [key: string]: unknown;
};

export type TreeNode = {
  segment: string;
  /** Path from root, e.g. /about/team */
  fullPath: string;
  children: TreeNode[];
  entries: CmsEntry[];
};

function segmentsFromUrl(url: unknown): string[] {
  if (typeof url !== "string" || !url.trim()) return [];
  const trimmed = url.replace(/^\/+|\/+$/g, "");
  if (!trimmed) return [];
  return trimmed.split("/").filter(Boolean);
}

export function emptyRoot(): TreeNode {
  return { segment: "", fullPath: "", children: [], entries: [] };
}

export function buildTreeFromUrls(entries: CmsEntry[]): TreeNode {
  const root = emptyRoot();

  const insert = (node: TreeNode, entry: CmsEntry, path: string[]) => {
    if (path.length === 0) {
      node.entries.push(entry);
      return;
    }
    const [head, ...rest] = path;
    let child = node.children.find((c) => c.segment === head);
    if (!child) {
      const prefix = node.fullPath === "" ? "" : node.fullPath;
      const fullPath = prefix ? `${prefix}/${head}` : `/${head}`;
      child = { segment: head, fullPath, children: [], entries: [] };
      node.children.push(child);
    }
    insert(child, entry, rest);
  };

  for (const entry of entries) {
    const path = segmentsFromUrl(entry.url);
    insert(root, entry, path);
  }

  const sortRecursive = (n: TreeNode) => {
    n.children.sort((a, b) => a.segment.localeCompare(b.segment));
    n.entries.sort((a, b) =>
      String(a.title ?? a.uid).localeCompare(String(b.title ?? b.uid))
    );
    n.children.forEach(sortRecursive);
  };
  sortRecursive(root);
  return root;
}
