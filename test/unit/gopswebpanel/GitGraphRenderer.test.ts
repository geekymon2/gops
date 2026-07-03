/// <reference types="vitest" />
import { describe, it, expect } from "vitest";
import {
  GitGraphRenderer,
  ROW_HEIGHT,
  LANE_WIDTH,
  HALF,
  EDGE_STROKE_WIDTH,
} from "../../../src/gopswebpanel/GitGraphRenderer";
import { GitCommitModel } from "../../../src/models/GitCommitModel";
import { CommitLayout } from "../../../src/models/CommitLayout";

const makeLayout = (overrides: Partial<CommitLayout> = {}): CommitLayout => ({
  hash: "abc1234",
  lane: 0,
  color: "#569cd6",
  outgoingEdges: [],
  incomingEdges: [],
  passThroughs: [],
  hasTopConnector: false,
  hasBottomConnector: false,
  ...overrides,
});

const makeCommit = (overrides: Partial<GitCommitModel> = {}): GitCommitModel =>
  new GitCommitModel(
    overrides.hash ?? "abc1234",
    overrides.message ?? "Fix bug",
    overrides.author ?? "John Doe",
    overrides.date ?? "2026-01-01T10:00:00",
    overrides.isMergeCommit ?? false,
    overrides.refs ?? [],
    overrides.parents ?? [],
  );

describe("GitGraphRenderer", () => {
  describe("laneX", () => {
    it("lane 0 returns LANE_WIDTH", () => {
      expect(GitGraphRenderer.laneX(0)).toBe(LANE_WIDTH);
    });

    it("lane 1 returns 2 * LANE_WIDTH", () => {
      expect(GitGraphRenderer.laneX(1)).toBe(2 * LANE_WIDTH);
    });

    it("lane 2 returns 3 * LANE_WIDTH", () => {
      expect(GitGraphRenderer.laneX(2)).toBe(3 * LANE_WIDTH);
    });
  });

  describe("makePath", () => {
    it("generates a vertical straight path when x coordinates are equal", () => {
      const path = GitGraphRenderer.makePath(10, 0, 10, 40, "#ff0000");
      expect(path).toContain("<path");
      expect(path).toContain("M 10 0");
      expect(path).toContain("L 10 40");
      expect(path).toContain('stroke="#ff0000"');
      expect(path).toContain(`stroke-width="${EDGE_STROKE_WIDTH}"`);
    });

    it("generates a curved path when x coordinates differ", () => {
      const path = GitGraphRenderer.makePath(10, 0, 30, 40, "#ff0000");
      expect(path).toContain("<path");
      expect(path).toContain("C ");
      expect(path).toContain('stroke="#ff0000"');
    });

    it("includes fill none", () => {
      const path = GitGraphRenderer.makePath(10, 0, 10, 40, "#ff0000");
      expect(path).toContain('fill="none"');
    });

    it("includes round linecap", () => {
      const path = GitGraphRenderer.makePath(10, 0, 10, 40, "#ff0000");
      expect(path).toContain('stroke-linecap="round"');
    });
  });

  describe("makeCommitMarker", () => {
    it("renders a normal commit as a filled circle", () => {
      const marker = GitGraphRenderer.makeCommitMarker(
        20,
        20,
        "#569cd6",
        "commit",
      );
      expect(marker).toContain("<circle");
      expect(marker).toContain('fill="#569cd6"');
      expect(marker).toContain('stroke="#000000"');
    });

    it("renders a merge commit as double ring circles", () => {
      const marker = GitGraphRenderer.makeCommitMarker(
        20,
        20,
        "#569cd6",
        "merge",
      );
      const circleCount = (marker.match(/<circle/g) ?? []).length;
      expect(circleCount).toBe(2);
    });

    it("renders a head commit as double diamond polygons", () => {
      const marker = GitGraphRenderer.makeCommitMarker(
        20,
        20,
        "#f0a500",
        "head",
      );
      const polygonCount = (marker.match(/<polygon/g) ?? []).length;
      expect(polygonCount).toBe(2);
    });

    it("merge marker uses editor background for outer fill", () => {
      const marker = GitGraphRenderer.makeCommitMarker(
        20,
        20,
        "#569cd6",
        "merge",
      );
      expect(marker).toContain("var(--vscode-editor-background)");
    });

    it("head marker uses editor background for outer fill", () => {
      const marker = GitGraphRenderer.makeCommitMarker(
        20,
        20,
        "#f0a500",
        "head",
      );
      expect(marker).toContain("var(--vscode-editor-background)");
    });

    it("places marker at correct cx and cy", () => {
      const marker = GitGraphRenderer.makeCommitMarker(
        15,
        25,
        "#569cd6",
        "commit",
      );
      expect(marker).toContain('cx="15"');
      expect(marker).toContain('cy="25"');
    });
  });

  describe("makeSvg", () => {
    it("wraps content in an svg element", () => {
      const svg = GitGraphRenderer.makeSvg(60, "<circle/>");
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).toContain("<circle/>");
    });

    it("sets correct width", () => {
      const svg = GitGraphRenderer.makeSvg(80, "");
      expect(svg).toContain('width="80"');
    });

    it("sets viewBox with correct ROW_HEIGHT", () => {
      const svg = GitGraphRenderer.makeSvg(60, "");
      expect(svg).toContain(`viewBox="0 0 60 ${ROW_HEIGHT}"`);
    });

    it("has graph class", () => {
      const svg = GitGraphRenderer.makeSvg(60, "");
      expect(svg).toContain('class="graph"');
    });
  });

  describe("drawGraphCell", () => {
    it("returns a div with col-graph class", () => {
      const cell = GitGraphRenderer.drawGraphCell(makeLayout(), 60, false);
      expect(cell).toContain('class="col-graph"');
    });

    it("contains an svg element", () => {
      const cell = GitGraphRenderer.drawGraphCell(makeLayout(), 60, false);
      expect(cell).toContain("<svg");
    });

    it("renders head marker for first commit", () => {
      const cell = GitGraphRenderer.drawGraphCell(makeLayout(), 60, true);
      expect(cell).toContain("<polygon");
    });

    it("renders normal marker for non-first non-merge commit", () => {
      const cell = GitGraphRenderer.drawGraphCell(makeLayout(), 60, false);
      expect(cell).toContain("<circle");
    });

    it("renders merge marker for commit with incoming edges", () => {
      const cl = makeLayout({
        incomingEdges: [
          {
            fromLane: 0,
            toLane: 1,
            fromHash: "abc",
            toHash: "def",
            color: "#569cd6",
          },
        ],
      });
      const cell = GitGraphRenderer.drawGraphCell(cl, 60, false);
      const circleCount = (cell.match(/<circle/g) ?? []).length;
      expect(circleCount).toBe(2);
    });

    it("renders top connector path when hasTopConnector is true", () => {
      const cl = makeLayout({ hasTopConnector: true });
      const cell = GitGraphRenderer.drawGraphCell(cl, 60, false);
      expect(cell).toContain("<path");
    });

    it("renders bottom connector path when hasBottomConnector is true", () => {
      const cl = makeLayout({ hasBottomConnector: true });
      const cell = GitGraphRenderer.drawGraphCell(cl, 60, false);
      expect(cell).toContain("<path");
    });

    it("renders passthrough paths", () => {
      const cl = makeLayout({
        passThroughs: [{ lane: 1, color: "#6a9955" }],
      });
      const cell = GitGraphRenderer.drawGraphCell(cl, 60, false);
      expect(cell).toContain("<path");
    });

    it("sets correct svgWidth on the div", () => {
      const cell = GitGraphRenderer.drawGraphCell(makeLayout(), 80, false);
      expect(cell).toContain("width:80px");
      expect(cell).toContain("min-width:80px");
    });

    it("does not render incoming edges for first commit", () => {
      const cl = makeLayout({
        incomingEdges: [
          {
            fromLane: 0,
            toLane: 1,
            fromHash: "abc",
            toHash: "def",
            color: "#569cd6",
          },
        ],
      });
      const cell = GitGraphRenderer.drawGraphCell(cl, 60, true);
      // isFirst=true means incoming edges are skipped, only head marker polygons rendered
      expect(cell).toContain("<polygon");
    });
  });

  describe("formatDate", () => {
    it("returns a non-empty string for a valid date", () => {
      const result = GitGraphRenderer.formatDate("2026-01-01T10:00:00");
      expect(result.length).toBeGreaterThan(0);
    });

    it("includes time in the formatted string", () => {
      const result = GitGraphRenderer.formatDate("2026-01-01T10:30:00");
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe("drawCommitRow", () => {
    it("renders a div with commit-row class", () => {
      const row = GitGraphRenderer.drawCommitRow(
        makeCommit(),
        makeLayout(),
        60,
        false,
        false,
      );
      expect(row).toContain('class="commit-row"');
    });

    it("renders alt class when isAlt is true", () => {
      const row = GitGraphRenderer.drawCommitRow(
        makeCommit(),
        makeLayout(),
        60,
        false,
        true,
      );
      expect(row).toContain("commit-row-alt");
    });

    it("renders the commit hash", () => {
      const row = GitGraphRenderer.drawCommitRow(
        makeCommit({ hash: "abc1234" }),
        makeLayout(),
        60,
        false,
        false,
      );
      expect(row).toContain("abc1234");
    });

    it("renders the commit message", () => {
      const row = GitGraphRenderer.drawCommitRow(
        makeCommit({ message: "Fix critical bug" }),
        makeLayout(),
        60,
        false,
        false,
      );
      expect(row).toContain("Fix critical bug");
    });

    it("renders the author", () => {
      const row = GitGraphRenderer.drawCommitRow(
        makeCommit({ author: "Jane Doe" }),
        makeLayout(),
        60,
        false,
        false,
      );
      expect(row).toContain("Jane Doe");
    });

    it("prefixes message with [MERGE] for merge commits", () => {
      const row = GitGraphRenderer.drawCommitRow(
        makeCommit({ message: "Merge branch feature", isMergeCommit: true }),
        makeLayout(),
        60,
        false,
        false,
      );
      expect(row).toContain("[MERGE]");
    });

    it("truncates message longer than 60 characters", () => {
      const longMessage = "a".repeat(70);
      const row = GitGraphRenderer.drawCommitRow(
        makeCommit({ message: longMessage }),
        makeLayout(),
        60,
        false,
        false,
      );
      expect(row).toContain("...");
    });

    it("does not truncate message shorter than 60 characters", () => {
      const shortMessage = "Short message";
      const row = GitGraphRenderer.drawCommitRow(
        makeCommit({ message: shortMessage }),
        makeLayout(),
        60,
        false,
        false,
      );
      expect(row).not.toContain("...");
    });

    it("sets data-hash attribute on the row", () => {
      const row = GitGraphRenderer.drawCommitRow(
        makeCommit({ hash: "abc1234" }),
        makeLayout(),
        60,
        false,
        false,
      );
      expect(row).toContain('data-hash="abc1234"');
    });

    it("renders ref pills for commits with refs", () => {
      const commit = makeCommit({
        refs: [{ label: "main", kind: "head" as any }],
      });
      const row = GitGraphRenderer.drawCommitRow(
        commit,
        makeLayout(),
        60,
        false,
        false,
      );
      expect(row).toContain('class="ref ref-head"');
      expect(row).toContain("main");
    });

    it("renders no ref pills for commits with no refs", () => {
      const row = GitGraphRenderer.drawCommitRow(
        makeCommit({ refs: [] }),
        makeLayout(),
        60,
        false,
        false,
      );
      expect(row).not.toContain('class="ref');
    });

    it("applies grey color style to merge commit message", () => {
      const row = GitGraphRenderer.drawCommitRow(
        makeCommit({ isMergeCommit: true }),
        makeLayout(),
        60,
        false,
        false,
      );
      expect(row).toContain("color:#888888");
    });

    it("does not apply grey color style to normal commit message", () => {
      const row = GitGraphRenderer.drawCommitRow(
        makeCommit({ isMergeCommit: false }),
        makeLayout(),
        60,
        false,
        false,
      );
      expect(row).not.toContain("color:#888888");
    });

    it("renders col-hash, col-message, col-author, col-date divs", () => {
      const row = GitGraphRenderer.drawCommitRow(
        makeCommit(),
        makeLayout(),
        60,
        false,
        false,
      );
      expect(row).toContain('class="col-hash"');
      expect(row).toContain('class="col-message"');
      expect(row).toContain('class="col-author"');
      expect(row).toContain('class="col-date"');
    });
  });
});
