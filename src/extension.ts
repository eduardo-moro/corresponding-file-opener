import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.openCorrespondingFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const config = vscode.workspace.getConfiguration('correspondingFiles');
        const sourceExtensions = config.get<string[]>('sourceExtensions', ['.c', '.cpp', '.cc', '.cxx']);
        const headerExtensions = config.get<string[]>('headerExtensions', ['.h', '.hpp', '.hh', '.hxx']);

        const currentDoc = editor.document;
        const fileName = currentDoc.fileName;
        const openedExt = path.extname(fileName).toLowerCase();
        const baseName = path.basename(fileName, openedExt);
        const dirName = path.dirname(fileName);

        const isSource = sourceExtensions.includes(openedExt);
        const isHeader = headerExtensions.includes(openedExt);

        if (!isSource && !isHeader) {
            return;
        }

        const targetExtensions = isSource ? headerExtensions : sourceExtensions;
        const targetViewColumn = isSource ? vscode.ViewColumn.Two : vscode.ViewColumn.One;

        for (const ext of targetExtensions) {
            const targetPath = path.join(dirName, baseName + ext);
            if (fs.existsSync(targetPath)) {
                try {
                    const targetDoc = await vscode.workspace.openTextDocument(targetPath);
                    await vscode.window.showTextDocument(targetDoc, {
                        viewColumn: targetViewColumn,
                        preserveFocus: true
                    });
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to open corresponding file: ${error}`);
                }
                break;
            }
        }
    });

    context.subscriptions.push(disposable);
}