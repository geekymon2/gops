/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderGitGraph } from "../../../src/gopswebpanel/GitGraphWebview";
import { GitCommitModel } from "../../../src/models/GitCommitModel";
import { GitGraphLayout } from "../../../src/gopswebpanel/GitGraphLayout";
import { GitGraphRenderer } from "../../../src/gopswebpanel/GitGraphRenderer";

vi.mock("../../../src/gopswebpanel/GitGraphLayout");
vi.mock("../../../src/gopswebpanel/GitGraphRenderer");
vi.mock("../../../src/gopswebpanel/GitGraphDetailsPanel", () => ({
  renderDetailPanel: () => '<div id="detail-panel"></div>',
}));

const mockCssUri = {
  toString: () => "vscode-resource:/media/gitGraph.css",
} as any;
const mockDetailCssUri = {
  toString: () => "vscode-resource:/media/gitGraphDetail.css",
} as any;
const mockScriptUri = {
  toString: () => "vscode-resource:/media/webPanel.js",
} as any;
const mockFilterScriptUri = {
  toString: () => "vscode-resource:/media/gitGraphFilter.js",
} as any;

const makeCommit = (hash: string): GitCommitModel =>
  new GitCommitModel(hash, "Fix bug", "John Doe", "2026-01-01", false, [], []);

describe("renderGitGraph", () => {
  beforeEach(() => {
    vi.mocked(GitGraphLayout.computeLayout).mockReturnValue(
      new Map([
        [
          "abc1234",
          {
            hash: "abc1234",
            lane: 0,
            color: "#569cd6",
            outgoingEdges: [],
            incomingEdges: [],
            passThroughs: [],
            hasTopConnector: false,
            hasBottomConnector: false,
          },
        ],
      ]),
    );
    vi.mocked(GitGraphRenderer.laneX).mockReturnValue(50);
    vi.mocked(GitGraphRenderer.drawCommitRow).mockReturnValue(
      '<div class="commit-row">row</div>',
    );
    vi.mocked(GitGraphRenderer.drawCommitRow).mockClear();
  });

  it("returns a valid HTML document string", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html>");
    expect(html).toContain("</html>");
  });

  it("links both CSS files in the head", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain("vscode-resource:/media/gitGraph.css");
    expect(html).toContain("vscode-resource:/media/gitGraphDetail.css");
  });

  it("includes the webPanel script tag", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain("vscode-resource:/media/webPanel.js");
  });

  it("includes the filter script tag", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain("vscode-resource:/media/gitGraphFilter.js");
  });

  it("renders the branch name in the header", () => {
    const html = renderGitGraph(
      "feature/my-branch",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain("feature/my-branch");
  });

  it("renders the commit count in the header", () => {
    const commits = [makeCommit("abc1234"), makeCommit("def5678")];
    const html = renderGitGraph(
      "main",
      commits,
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain("2 commits");
  });

  it("renders the GIT GRAPH heading and icon", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain("GIT GRAPH");
    expect(html).toContain("⋔");
  });

  it("renders the column headers", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain("Hash");
    expect(html).toContain("Message");
    expect(html).toContain("Author");
    expect(html).toContain("Date");
  });

  it("renders the commits container", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain('id="commits-container"');
    expect(html).toContain('<div class="commit-row">row</div>');
  });

  it("renders the detail panel", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain('id="detail-panel"');
  });

  it("includes svgWidth style for col-graph", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain("width: 50px");
  });

  it("calls computeLayout with the commits", () => {
    const commits = [makeCommit("abc1234")];
    renderGitGraph(
      "main",
      commits,
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(GitGraphLayout.computeLayout).toHaveBeenCalledWith(commits);
  });

  it("skips rows where layout entry is missing", () => {
    vi.mocked(GitGraphLayout.computeLayout).mockReturnValue(new Map());
    vi.mocked(GitGraphRenderer.drawCommitRow).mockClear();

    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(GitGraphRenderer.drawCommitRow).not.toHaveBeenCalled();
    expect(html).toContain('id="commits-container"');
  });

  it("renders 1 commit correctly", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain("1 commits");
  });

  it("renders empty commits container when no commits", () => {
    vi.mocked(GitGraphLayout.computeLayout).mockReturnValue(new Map());
    vi.mocked(GitGraphRenderer.drawCommitRow).mockClear();

    const html = renderGitGraph(
      "main",
      [],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain("0 commits");
    expect(GitGraphRenderer.drawCommitRow).not.toHaveBeenCalled();
  });

  it("renders the filter bar", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain('id="filter-bar"');
  });

  it("renders the hash filter input", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain('id="filter-hash"');
    expect(html).toContain('placeholder="Hash"');
  });

  it("renders the message filter input", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain('id="filter-message"');
    expect(html).toContain('placeholder="Message"');
  });

  it("renders the author filter input", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain('id="filter-author"');
    expect(html).toContain('placeholder="Author"');
  });

  it("renders the date from and to inputs", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain('id="filter-date-from"');
    expect(html).toContain('id="filter-date-to"');
    expect(html).toContain('type="date"');
  });

  it("renders the clear button", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    expect(html).toContain('id="filter-clear"');
    expect(html).toContain("Clear");
  });

  it("renders filter script before webPanel script", () => {
    const html = renderGitGraph(
      "main",
      [makeCommit("abc1234")],
      mockCssUri,
      mockDetailCssUri,
      mockScriptUri,
      mockFilterScriptUri,
    );

    const filterIdx = html.indexOf("gitGraphFilter.js");
    const webPanelIdx = html.indexOf("webPanel.js");
    expect(filterIdx).toBeLessThan(webPanelIdx);
  });
});
