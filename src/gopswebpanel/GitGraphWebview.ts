import * as vscode from "vscode";
import { GitCommitModel } from "../models/GitCommitModel";
import { GitGraphLayout } from "./GitGraphLayout";
import { GitGraphRenderer } from "./GitGraphRenderer";
import { CommitLayout } from "../models/CommitLayout";
import { renderDetailPanel } from "./GitGraphDetailsPanel";

export function renderGitGraph(
  branchName: string,
  commits: GitCommitModel[],
  cssUri: vscode.Uri,
  detailCssUri: vscode.Uri,
  scriptUri: vscode.Uri,
  filterScriptUri: vscode.Uri,
): string {
  const layout = GitGraphLayout.computeLayout(commits);

  let maxLane = 0;
  layout.forEach((entry: CommitLayout) => {
    if (entry.lane > maxLane) {
      maxLane = entry.lane;
    }
  });

  const svgWidth = GitGraphRenderer.laneX(maxLane + 2);

  const rows = commits
    .map((commit, i) => {
      const cl = layout.get(commit.hash);
      if (!cl) {
        return "";
      }
      return GitGraphRenderer.drawCommitRow(
        commit,
        cl,
        svgWidth,
        i === 0,
        i % 2 !== 0,
      );
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" href="${cssUri}">
      <link rel="stylesheet" href="${detailCssUri}">
      <style>
        .col-graph { width: ${svgWidth}px; min-width: ${svgWidth}px; }
        #header-graph { width: ${svgWidth}px; min-width: ${svgWidth}px; }
      </style>
    </head>
    <body>
      <div id="header">
        <span style="font-size: 20px;">⋔</span>
        <h2>GIT GRAPH</h2>
        <span class="branch-badge">${branchName}</span>
        <span class="commit-count">${commits.length} commits</span>
      </div>

      <div id="filter-bar">
        <input type="text" id="filter-hash" placeholder="Hash" />
        <input type="text" id="filter-message" placeholder="Message" />
        <input type="text" id="filter-author" placeholder="Author" />
        <input type="date" id="filter-date-from" />
        <input type="date" id="filter-date-to" />
        <button id="filter-clear">Clear</button>
      </div>

      <div id="column-headers">
        <div class="col-graph" id="header-graph"></div>
        <div class="col-hash">Hash</div>
        <div class="col-message">Message</div>
        <div class="col-author">Author</div>
        <div class="col-date">Date</div>
      </div>

      <div id="commits-container">
        ${rows}
      </div>

      ${renderDetailPanel()}

      <script src="${filterScriptUri}"></script>
      <script src="${scriptUri}"></script>
    </body>
    </html>
  `;
}
