import ContentstackAppSDK from "@contentstack/app-sdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildTreeFromUrls,
  type CmsEntry,
  type TreeNode,
} from "./buildUrlTree";

type ContentTypeOption = { uid: string; title?: string };
type AppSdkWithApi = {
  api: (url: string, options?: RequestInit) => Promise<Response>;
  endpoints: {
    CMA: string;
  };
};

function normalizeEntryList(raw: unknown): CmsEntry[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (e): e is CmsEntry =>
        e != null && typeof e === "object" && typeof (e as CmsEntry).uid === "string"
    );
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as { entries?: unknown }).entries)) {
    return normalizeEntryList((raw as { entries: unknown }).entries);
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)) {
    return normalizeEntryList((raw as { items: unknown }).items);
  }
  return [];
}

function normalizeContentTypes(raw: unknown): ContentTypeOption[] {
  if (Array.isArray(raw)) {
    return (raw as { uid: string; title?: string }[]).map((c) => ({
      uid: c.uid,
      title: c.title,
    }));
  }
  if (raw && typeof raw === "object" && "content_types" in raw) {
    const ct = (raw as { content_types: unknown }).content_types;
    return normalizeContentTypes(ct);
  }
  return [];
}

/** Retrieve all entries for a content type via the App SDK CMA bridge. */
async function fetchAllEntries(
  appSdk: AppSdkWithApi,
  contentTypeUid: string
): Promise<CmsEntry[]> {
  const pageSize = 100;
  const all: CmsEntry[] = [];
  for (let skip = 0; skip < 50_000; skip += pageSize) {
    const url = new URL(
      `${appSdk.endpoints.CMA}/v3/content_types/${encodeURIComponent(contentTypeUid)}/entries`
    );
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("skip", String(skip));
    url.searchParams.set("include_unpublished", "true");

    const response = await appSdk.api(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to load entries for "${contentTypeUid}" (${response.status})`);
    }

    const payload = (await response.json()) as unknown;
    const batch = normalizeEntryList(payload);
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}

function TreeBranch({ node, depth }: { node: TreeNode; depth: number }) {
  const pad = 12 + depth * 16;

  if (node.segment === "" && node.children.length === 0 && node.entries.length === 0) {
    return (
      <p style={{ marginLeft: pad, color: "#666" }}>
        No entries were returned for this content type.
      </p>
    );
  }

  return (
    <>
      {node.entries.length > 0 && (
        <ul
          style={{
            margin: "0.25rem 0",
            paddingLeft: pad,
            listStyle: "none",
          }}
        >
          {node.entries.map((e) => (
            <li key={e.uid} style={{ margin: "0.2rem 0" }}>
              <span style={{ fontWeight: 600 }}>{String(e.title ?? "(no title)")}</span>
              <span style={{ color: "#555", marginLeft: 8, fontSize: "0.9em" }}>
                {e.url ? String(e.url) : "—"}
              </span>
              <code
                style={{
                  marginLeft: 8,
                  fontSize: "0.8em",
                  background: "#e8eaef",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {e.uid}
              </code>
            </li>
          ))}
        </ul>
      )}
      {node.children.map((child) => (
        <details
          key={child.fullPath}
          style={{ marginLeft: Math.max(0, depth * 8), marginBottom: 4 }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontWeight: 600,
              padding: "4px 0",
            }}
          >
            {child.segment}
            <span style={{ fontWeight: 400, color: "#666", marginLeft: 8 }}>
              {child.fullPath}
            </span>
          </summary>
          <TreeBranch node={child} depth={depth + 1} />
        </details>
      ))}
    </>
  );
}

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stackLabel, setStackLabel] = useState<string>("");
  const [contentTypes, setContentTypes] = useState<ContentTypeOption[]>([]);
  const [selectedCt, setSelectedCt] = useState<string>("page");
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [entryCount, setEntryCount] = useState<number>(0);

  const loadTypesAndEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sdk = await ContentstackAppSDK.init();
      if (!sdk.location?.FullPage) {
        setError(
          "Full Page location not available (open this app from an installed stack app, or check UI Locations)."
        );
        setLoading(false);
        return;
      }

      const stack = sdk.stack;
      const appSdkWithApi = sdk as unknown as AppSdkWithApi;
      const stackData = stack.getData?.();
      if (stackData && typeof stackData === "object" && "name" in stackData) {
        setStackLabel(String((stackData as { name?: string }).name ?? ""));
      }

      const ctRaw = await stack.getContentTypes();
      const options = normalizeContentTypes(ctRaw);

      setContentTypes(options);

      let ctUid = selectedCt;
      if (options.length && !options.some((o) => o.uid === ctUid)) {
        ctUid = options[0].uid;
        setSelectedCt(ctUid);
      }

      const entries = await fetchAllEntries(appSdkWithApi, ctUid);
      setEntryCount(entries.length);
      setTree(buildTreeFromUrls(entries));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedCt]);

  useEffect(() => {
    void loadTypesAndEntries();
  }, [loadTypesAndEntries]);

  const typeSelect = useMemo(
    () =>
      contentTypes.length ? (
        <label style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>Content type</span>
          <select
            value={selectedCt}
            onChange={(ev) => setSelectedCt(ev.target.value)}
            style={{ padding: "6px 10px", minWidth: 200 }}
          >
            {contentTypes.map((c) => (
              <option key={c.uid} value={c.uid}>
                {c.title ? `${c.title} (${c.uid})` : c.uid}
              </option>
            ))}
          </select>
        </label>
      ) : null,
    [contentTypes, selectedCt]
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 48px" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "1.35rem" }}>Page URL tree</h1>
        <p style={{ margin: 0, color: "#444", fontSize: "0.95rem" }}>
          Entries are grouped by the <code>url</code> path (same convention as this site&apos;s{" "}
          <code>page</code> type). Choose a content type, then expand folders.
        </p>
        {stackLabel ? (
          <p style={{ margin: "8px 0 0", fontSize: "0.9rem", color: "#666" }}>
            Stack: {stackLabel}
          </p>
        ) : null}
        {!loading && !error ? (
          <p style={{ margin: "8px 0 0", fontSize: "0.9rem", color: "#666" }}>
            Selected content type: <code>{selectedCt}</code> | Entries returned: {entryCount}
          </p>
        ) : null}
      </header>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        {typeSelect}
        <button
          type="button"
          onClick={() => void loadTypesAndEntries()}
          disabled={loading}
          style={{ padding: "8px 16px", cursor: loading ? "wait" : "pointer" }}
        >
          Refresh
        </button>
      </div>

      {loading ? <p>Loading…</p> : null}
      {error ? (
        <div
          style={{
            background: "#fdecea",
            border: "1px solid #f5c2c0",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <strong>Error</strong>
          <p style={{ margin: "8px 0 0" }}>{error}</p>
          <p style={{ margin: "12px 0 0", fontSize: "0.9rem", color: "#555" }}>
            For local development, run <code>npm run dev</code> and tunnel with ngrok (HTTPS). In
            Developer Hub, set Hosting to that URL and add a Full Page location. Grant app
            permissions to read content types and entries.
          </p>
        </div>
      ) : null}

      {!loading && !error && tree ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e0e3e8",
            borderRadius: 10,
            padding: 16,
          }}
        >
          <TreeBranch node={tree} depth={0} />
        </div>
      ) : null}
    </div>
  );
}
