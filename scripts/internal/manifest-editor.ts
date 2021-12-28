import inquirer from "inquirer";
import yargs from "yargs";
import Workspace from "./workspace";

interface BaseEditorArguments {
    root?: boolean;
    upsert?: boolean;
}

interface StaticManifestEditor<CLI extends yargs.Argv<CLIInner>, CLIInner extends BaseEditorArguments = CLI extends yargs.Argv<infer U> ? U : {}> {
    cli: CLI;
    new(): ManifestEditor<this>;
}

abstract class ManifestEditor<StaticEditor extends StaticManifestEditor<yargs.Argv<CLIInner>>, CLIInner extends BaseEditorArguments = BaseEditorArguments> {
    get cli(): StaticEditor["cli"] {
        return (this.constructor as unknown as StaticEditor)["cli"];
    }
    
    #argv: this["argv"] | null = null;

    get argv(): ReturnType<StaticEditor["cli"]["parseSync"]> {
        if (this.#argv) return this.#argv;
        return this.cli.parseSync() as this["argv"];
    }

    validate(): void {}
    abstract apply(workspaces: Workspace[]): boolean | void | Promise<boolean | void>

    async run() {
        this.#argv = null, this.validate();
    
        const workspaces = await Workspace.listWorkspaces(this.argv.root);
    
        const trySaving = await this.apply(workspaces);
    
        if (trySaving) {
            const { confirmed } = await inquirer.prompt({
                type: "confirm",
                name: "confirmed",
                message: "Write the following manifests?"
            });
            
            if (confirmed) {
                await Promise.all(workspaces.map(workspace => workspace.saveIfNeeded()));
            }
        } else {
            console.log('No changes made.');
            process.exit(0);
        } 
    }
}

export function Editor() {
    return <U extends StaticManifestEditor<yargs.Argv<{}>>>(constructor: U) => {constructor};
}

export default ManifestEditor;