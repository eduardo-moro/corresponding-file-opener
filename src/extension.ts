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
        const sourceExtensions = config.get<string[]>('sourceExtensions', ['.c', '.cpp', '.cc', '.cxx', '.rb']);
        const headerExtensions = config.get<string[]>('headerExtensions', ['.h', '.hpp', '.hh', '.hxx', '_spec.rb']);
        
        // Regex patterns with capture groups for the base name
        const regexPatterns = config.get<{source: string, target: string}[]>('regexPatterns', [
            {
                source: '^(.*)(\\..+)$',  // matches any filename with extension
                target: '$1_spec$2'       // transforms to spec file
            },
            {
                source: '^(.*?)(_spec)?(\\..+)$',  // matches spec or non-spec
                target: '$1$3'                     // toggles _spec
            },
            {
                source: '^(.*)(\\..+)$',           // matches any filename with extension
                target: '$1_test$2'                // transforms to test file
            },
            {
                source: '^(.*?)(_test)?(\\..+)$',  // matches test or non-test
                target: '$1$3'                    // toggles _test
            }
        ]);

        const currentDoc = editor.document;
        const fileName = path.basename(currentDoc.fileName);
        const openedExt = path.extname(fileName).toLowerCase();
        const dirName = path.dirname(currentDoc.fileName);

        const isSource = sourceExtensions.some(ext => fileName.endsWith(ext));
        const isHeader = headerExtensions.some(ext => fileName.endsWith(ext));

        if (!isSource && !isHeader) {
            vscode.window.showInformationMessage('Current file type not configured for corresponding files');
            return;
        }

        const targetViewColumn = isSource ? vscode.ViewColumn.Two : vscode.ViewColumn.One;

        // Try all regex patterns to find matching files
        for (const pattern of regexPatterns) {
            const regex = new RegExp(pattern.source);
            if (regex.test(fileName)) {
                const targetName = fileName.replace(regex, pattern.target);
                const targetPath = path.join(dirName, targetName);
                
                if (fs.existsSync(targetPath)) {
                    try {
                        const targetDoc = await vscode.workspace.openTextDocument(targetPath);
                        await vscode.window.showTextDocument(targetDoc, {
                            viewColumn: targetViewColumn,
                            preserveFocus: true
                        });
                        return; // Found the file, exit
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to open corresponding file: ${error}`);
                    }
                }
            }
        }

        // Fallback to simple extension swap if no regex matches
        const baseName = path.basename(fileName, openedExt);
        const targetExtensions = isSource ? headerExtensions : sourceExtensions;
        
        for (const ext of targetExtensions) {
            const targetPath = path.join(dirName, baseName + ext);
            if (fs.existsSync(targetPath)) {
                try {
                    const targetDoc = await vscode.workspace.openTextDocument(targetPath);
                    await vscode.window.showTextDocument(targetDoc, {
                        viewColumn: targetViewColumn,
                        preserveFocus: true
                    });
                    return;
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to open corresponding file: ${error}`);
                }
            }
        }

        vscode.window.showInformationMessage('No corresponding file found');
    });

    context.subscriptions.push(disposable);
}
