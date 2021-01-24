import * as vscode from 'vscode';


let snippetEditor: vscode.TextEditor | undefined;
let snippetSelection: vscode.Selection | undefined;
let snippetText: string | undefined;

export function activate(context: vscode.ExtensionContext) {
  let disposable;

  disposable = vscode.commands.registerCommand('vscode-snippeteer.create-start', createSnippetStart);
  context.subscriptions.push(disposable);
  disposable = vscode.commands.registerCommand('vscode-snippeteer.create-finish', createSnippetFinish);
  context.subscriptions.push(disposable);
}

function createSnippetStart() {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    if (editor.selection.isEmpty) {
      vscode.window.showErrorMessage('Select text to start creating selection.');
    } else {
      createSnippetFromSelectionInEditor(editor, editor.selection);
    }
  } else {
    vscode.window.showErrorMessage('Open text based editor and select text to start creating selection.');
  }
}

function createSnippetFromSelectionInEditor(editor: vscode.TextEditor, selection: vscode.Selection) {
  snippetEditor = editor;
  snippetSelection = selection;

  snippetText = snippetEditor.document.getText(snippetSelection);
  vscode.window.showInformationMessage(
    `Create cursors or selections in the text \n\n\n${snippetText}\n\n\n to define tab stops and then invoke command 'Finish Creating snippet'`,
    {
      modal: true
    }
  );
}

function createSnippetFinish() {
  if (snippetEditor && snippetSelection && !snippetSelection.isEmpty) {
    try {
      const candidateSelectionsForTabStopsOrder = new Map<vscode.Selection, number>();
      const candidateSelectionsForTabStops: vscode.Selection[] = [];
      let tabStopIndex = 1;
      snippetEditor.selections.forEach((selection) => {
        if (snippetSelection!.contains(selection)) {
          candidateSelectionsForTabStopsOrder.set(selection, tabStopIndex);
          tabStopIndex += 1;
          candidateSelectionsForTabStops.push(selection);
        }
      });
      // sort later selection to earlier
      candidateSelectionsForTabStops.sort((a, b) => {
        if (a.start.isAfter(b.start)) {
          return -1;
        }
        if (a.start.isBefore(b.start)) {
          return 1;
        }
        return 0;
      });

      const snippetSelectionOffset = snippetEditor.document.offsetAt(snippetSelection.start);
      const snippetTextArray = snippetText!.split('');

      candidateSelectionsForTabStops.forEach((selection) => {
        const tabStopIndex = candidateSelectionsForTabStopsOrder.get(selection);
        const selectionOffset = snippetEditor!.document.offsetAt(selection.start);
        const selectionText = snippetEditor!.document.getText(selection);
        const selectionOffsetInText = selectionOffset - snippetSelectionOffset;
        snippetTextArray.splice(selectionOffsetInText, selectionText.length, ...(`$\{${tabStopIndex}:${selectionText}}`));
      });
      snippetText = snippetTextArray.join('').split(/\n|\r\n/).map((line, index) => {
        return (index > 0 ? ',' : ' ') + `"${line}"`;
      }).join('\n');

      vscode.env.clipboard.writeText(snippetText!);
      // const languageId = snippetEditor!.document.languageId;
      vscode.commands.executeCommand('workbench.action.openSnippets');

    } finally {
      snippetEditor = undefined;
      snippetSelection = undefined;
      snippetText = undefined;
    }
  } else {
    vscode.window.showErrorMessage('Open text based editor and select text to start creating selection.');
  }
}
