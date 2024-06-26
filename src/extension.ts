import vscode from "vscode";
import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import url from "url";

const CACHE_FILE = path.join(__dirname, "custom_import_information.json");
const CACHE_DURATION = 60; // minutes

async function fetchJson(sourceURL: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(sourceURL);
        const protocol = parsedUrl.protocol === "https:" ? https : http;

        protocol
            .get(sourceURL, (res) => {
                let data = "";

                res.on("data", (chunk) => {
                    data += chunk;
                });

                res.on("end", () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .on("error", (err) => {
                reject(err);
            });
    });
}

async function getCustomImportInformation(): Promise<any> {
    const now = Date.now();
    const config = vscode.workspace.getConfiguration("customImportInformation");
    let url: string | undefined = config.get<string>("jsonUrl", "");

    console.log("URL: ", url);

    if (!url) {
        url = await vscode.window.showInputBox({
            prompt: "Enter the URL of the JSON file containing import information messages",
            ignoreFocusOut: true,
            validateInput: (input) => {
                try {
                    new URL(input);
                    return "";
                } catch {
                    return "Invalid URL format";
                }
            },
        });

        if (!url) {
            throw new Error(
                "URL is required to fetch import information messages."
            );
        }

        await config.update("jsonUrl", url, vscode.ConfigurationTarget.Global);
    }

    const cacheDuration = config.get<number>("cacheDuration", CACHE_DURATION);

    if (fs.existsSync(CACHE_FILE)) {
        const stats = fs.statSync(CACHE_FILE);
        const mtime = new Date(stats.mtime).getTime();

        if (now - mtime < cacheDuration * 1000 * 60) {
            return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
        }
    }

    try {
        const data = await fetchJson(url);
        fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
        return data;
    } catch (error) {
        if (fs.existsSync(CACHE_FILE)) {
            return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
        } else {
            throw error;
        }
    }
}

function displayCustomImportInformation(
    customImportInformationConfig: any,
    document: vscode.TextDocument,
    diagnosticCollection: vscode.DiagnosticCollection
) {
    const importRegex = /import\s+(.*)\s+from\s+['"](.*)['"]/g;
    const text = document.getText();
    const diagnostics: vscode.Diagnostic[] = [];
    let match;

    while ((match = importRegex.exec(text)) !== null) {
        const importSource = match[2];
        if (
            customImportInformationConfig.customImportInformationItems[
                importSource
            ]
        ) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            const diagnostic = new vscode.Diagnostic(
                range,
                `${customImportInformationConfig.customImportInformationItems[importSource].message}`,
                vscode.DiagnosticSeverity.Warning
            );
            diagnostics.push(diagnostic);
        }
    }

    diagnosticCollection.set(document.uri, diagnostics);
}

export function activate(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection(
        "customImportMessageDiagCollection"
    );
    context.subscriptions.push(diagnosticCollection);

    const disposable = vscode.commands.registerCommand(
        "extension.displayCustomImportInformation",
        async () => {
            try {
                const customImportInformationConfig =
                    await getCustomImportInformation();
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    displayCustomImportInformation(
                        customImportInformationConfig,
                        editor.document,
                        diagnosticCollection
                    );
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(
                    `Failed to check custom import information: ${error.message}`
                );
            }
        }
    );

    context.subscriptions.push(disposable);

    vscode.workspace.onDidSaveTextDocument(
        async (document: vscode.TextDocument) => {
            try {
                const customImportInformationConfig =
                    await getCustomImportInformation();
                displayCustomImportInformation(
                    customImportInformationConfig,
                    document,
                    diagnosticCollection
                );
            } catch (error: any) {
                vscode.window.showErrorMessage(
                    `Failed to check custom import information: ${error.message}`
                );
            }
        }
    );

    vscode.workspace.onDidOpenTextDocument(
        async (document: vscode.TextDocument) => {
            try {
                const customImportInformationConfig =
                    await getCustomImportInformation();
                displayCustomImportInformation(
                    customImportInformationConfig,
                    document,
                    diagnosticCollection
                );
            } catch (error: any) {
                vscode.window.showErrorMessage(
                    `Failed to check custom import information: ${error.message}`
                );
            }
        }
    );
}

export function deactivate() {}
