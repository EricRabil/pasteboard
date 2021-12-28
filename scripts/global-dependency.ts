#!yarn ts-node

import yargs from "yargs";
import ManifestEditor, { Editor } from "./internal/manifest-editor";
import Workspace, { Dependency } from "./internal/workspace";

@Editor()
class DependencyEditor extends ManifestEditor<typeof DependencyEditor> {
    static cli = yargs(process.argv.slice(2))
        .version(false)
        .positional("name", { desc: "name of the dependency", demandOption: true, type: "string" })
        .positional("version", { desc: "new dep version", demandOption: true, type: "string" })
        .boolean("developer").alias("developer", "d").alias("developer", "D").alias("developer", "send package to devDependencies")
        .boolean("upsert").alias("upsert", "u").alias("upsert", "U").describe("upsert", "apply to all workspaces rather than just those that already have the package")
        .boolean("root").alias("root", "r").alias("root", "R").describe("root", "include the root package.json in the update").default("root", false);

    override validate({ _: [ name, version ] } = this.argv) {
        if (!name || !version) {
            this.cli.showHelp();
            process.exit(1);
        }
    }

    apply(workspaces: Workspace[], { developer, upsert, root, _: [ name, version ] } = this.argv): boolean | void | Promise<boolean | void> {
        const dependency: Dependency = { name: name as string, version: version as string, developer };

        let hasChanges = false;

        for (const workspace of workspaces) {
            if (workspace.updateDependency(dependency, upsert)) {
                hasChanges = true;
                console.dir(workspace);
            }
        }

        return hasChanges;
    }
}

new DependencyEditor().run();
