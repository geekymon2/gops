import * as vscode from "vscode";
import { GitService } from "../services/GitService";
import { renderGitGraph } from "./GitGraphWebview";

export class GitGraphPanel {
  private static currentPanel: GitGraphPanel | undefined;

  private constructor(private readonly panel: vscode.WebviewPanel) {}

  public static async createOrShow(branchName: string, gitService: GitService) {
    const extensionUri =
      vscode.extensions.getExtension("codemanxdev.gops")!.extensionUri;
    const panel = vscode.window.createWebviewPanel(
      "gitGraph",
      `Git Graph: ${branchName}`,
      vscode.ViewColumn.One,
      { enableScripts: true },
    );

    panel.onDidDispose(() => {
      GitGraphPanel.currentPanel = undefined;
    });

    const instance = new GitGraphPanel(panel);
    GitGraphPanel.currentPanel = instance;

    await instance.render(extensionUri, branchName, gitService);
    instance.registerMessageHandler(gitService);
  }

  private async render(
    extensionUri: vscode.Uri,
    branchName: string,
    gitService: GitService,
  ) {
    const commits = await gitService.getBranchCommits(branchName);
    const cssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "gitGraph.css"),
    );
    const detailCssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "gitGraphDetail.css"),
    );
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "webPanel.js"),
    );
    const filterScriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "gitGraphFilter.js"),
    );
    this.panel.webview.html = renderGitGraph(
      branchName,
      commits,
      cssUri,
      detailCssUri,
      scriptUri,
      filterScriptUri,
    );
  }

  private registerMessageHandler(gitService: GitService) {
    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "createTag":
          await GitGraphPanel.handleCreateTag(message.hash, gitService);
          break;
        case "getCommitDetail":
          await this.handleGetCommitDetail(message.hash, gitService);
          break;
        case "checkoutCommit":
          await GitGraphPanel.handleCheckoutCommit(message.hash, gitService);
          break;
        case "cherryPick":
          await GitGraphPanel.handleCherryPick(message.hash, gitService);
          break;
      }
    });
  }

  private async handleGetCommitDetail(hash: string, gitService: GitService) {
    const detail = await gitService.getCommitDetail(hash);
    this.panel.webview.postMessage({ command: "commitDetail", detail });
  }

  private static async handleCreateTag(hash: string, gitService: GitService) {
    const tagName = await vscode.window.showInputBox({
      prompt: "Enter tag name",
      placeHolder: "e.g. v1.0.0",
      validateInput: (value) => {
        if (!value.trim()) {
          return "Tag name cannot be empty";
        }
        if (/[\s~^:?*\[\\]/.test(value)) {
          return "Tag name contains invalid characters";
        }
        return undefined;
      },
    });

    if (!tagName) {
      return;
    }

    const items: (vscode.QuickPickItem & {
      tagKind: "lightweight" | "annotated";
    })[] = [
      {
        label: "$(tag) Lightweight",
        description: "A simple pointer to a commit",
        tagKind: "lightweight",
      },
      {
        label: "$(tag) Annotated",
        description: "Includes a message, author, and date",
        tagKind: "annotated",
      },
    ];

    const tagType = await vscode.window.showQuickPick(items, {
      placeHolder: "Choose tag type",
    });

    if (!tagType) {
      return;
    }

    let message: string | undefined;
    if (tagType.tagKind === "annotated") {
      message = await vscode.window.showInputBox({
        prompt: "Enter tag message",
        placeHolder: "e.g. Release version 1.0.0",
        validateInput: (value) =>
          !value.trim() ? "Message cannot be empty" : undefined,
      });
      if (!message) {
        return;
      }
    }

    await gitService.createTag(tagName.trim(), hash, message);
  }

  private static async handleCheckoutCommit(
    hash: string,
    gitService: GitService,
  ) {
    const confirmed = await vscode.window.showWarningMessage(
      `Checkout commit ${hash}? This will put you in a detached HEAD state.`,
      { modal: true },
      "Checkout",
    );
    if (confirmed === "Checkout") {
      await gitService.checkout(hash);
    }
  }

  private static async handleCherryPick(hash: string, gitService: GitService) {
    const confirmed = await vscode.window.showWarningMessage(
      `Cherry pick commit ${hash} onto current branch?`,
      { modal: true },
      "Cherry Pick",
    );
    if (confirmed !== "Cherry Pick") {
      return;
    }

    try {
      await gitService.cherryPick(hash);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (
        message.includes("nothing to commit") ||
        message.includes("allow-empty")
      ) {
        const action = await vscode.window.showWarningMessage(
          `Commit ${hash} is already on this branch. Commit as empty or skip?`,
          { modal: true },
          "Commit Empty",
          "Skip",
          "Abort",
        );

        if (action === "Commit Empty") {
          await gitService.cherryPickAllowEmpty(hash);
        } else if (action === "Skip") {
          await gitService.cherryPickSkip();
        } else {
          await gitService.cherryPickAbort();
        }
      }
    }
  }
}
