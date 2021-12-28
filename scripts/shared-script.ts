#!yarn ts-node

import yargs from "yargs";
import ManifestEditor, { Editor } from "./internal/manifest-editor";
import Workspace, { Script } from "./internal/workspace";

@Editor()
class ScriptsEditor extends ManifestEditor<typeof ScriptsEditor> {
    static cli = yargs(process.argv.slice(2))
        .positional("name", { desc: "name of the script", demandOption: true, type: "string" })
        .positional("command", {
            array: true, demandOption: true, type: "string"
        })
        .boolean("developer").alias("developer", "d").alias("developer", "D").alias("developer", "send package to devDependencies")
        .boolean("upsert").alias("upsert", "u").alias("upsert", "U").describe("upsert", "apply to all workspaces rather than just those that already have the package")
        .boolean("root").alias("root", "r").alias("root", "R").describe("root", "include the root package.json in the update").default("root", false);
    
    apply(workspaces: Workspace[], { upsert, _: [ name, command ] } = this.argv) {
        const script: Script = { name: name as string, command: command as string };

        let hasChanges = false;
        
        for (const workspace of workspaces) {
            if (workspace.updateScript(script, upsert)) {
                hasChanges = true;
                console.dir(workspace);
            }
        }

        return hasChanges;
    }
}

new ScriptsEditor().run();
