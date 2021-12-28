#!yarn ts-node

import { readFile, writeFile } from "fs-extra";
import { resolve } from "path";
import { SRCROOT } from "./const";
import shell from "./shell";

export interface Dependency {
    name: string;
    version: string;
    developer?: boolean;
}

export interface Script {
    name: string;
    command: string;
}

export interface Manifest {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

export interface RawWorkspace {
    location: string;
    name: string;
}

export interface IWorkspace extends RawWorkspace {
    manifest: Manifest;
    manifestLocation: string;
}

export class WorkspaceValidationError extends Error {
    constructor(public workspace: Workspace, public message: string) {
        super(message);
    }
}

export default class Workspace implements IWorkspace {
    location: string;
    name: string;
    manifest: Manifest;
    manifestLocation: string;

    static async listWorkspaces(includingRoot = false): Promise<Workspace[]> {
        const { stdout } = await shell("yarn workspaces list --json", { cwd: SRCROOT });
        const lines = stdout.trim().split("\n");
    
        const workspaces: Workspace[] = [];
        const splice: number[] = [];
    
        await Promise.all(lines.map(async (line, index) => {
            const { location: relativeLocation, name }: RawWorkspace = JSON.parse(line);
            if (relativeLocation === "." && !includingRoot) {
                splice.push(index);
                return;
            }
    
            const location = resolve(SRCROOT, relativeLocation);
            const manifestLocation = resolve(location, "package.json");
            const manifest: Manifest = JSON.parse((await readFile(manifestLocation)).toString("utf8"));
    
            workspaces[index] = new Workspace({
                location,
                name,
                manifest,
                manifestLocation
            });
        }));

        for (const index of splice) {
            workspaces.splice(index, 1);
        }
    
        return workspaces;
    }

    #modified = false;

    constructor({ location, name, manifest, manifestLocation }: IWorkspace) {
        this.location = location;
        this.name = name;
        this.manifest = manifest;
        this.manifestLocation = manifestLocation;
    }

    get #devDependencies(): Record<string, string> {
        return this.manifest.devDependencies ?? (this.manifest.devDependencies = {});
    }
    
    get #dependencies(): Record<string, string> {
        return this.manifest.dependencies ?? (this.manifest.dependencies = {});
    }

    get #scripts(): Record<string, string> {
        return this.manifest.scripts ?? (this.manifest.scripts = {});
    }

    #hasDependency({ name, developer }: Dependency): boolean {
        return !!(developer ? this.#devDependencies : this.#dependencies)[name];
    }

    upsertDependency({ name, version, developer }: Dependency): boolean {
        const dependencyBlock = developer ? this.#devDependencies : this.#dependencies;
        if (dependencyBlock[name] === version) return false;

        dependencyBlock[name] = version;
        return this.#modified = true;
    }

    updateDependency(dependency: Dependency, upsert = false): boolean {
        if (!upsert && !this.#hasDependency(dependency)) return false;
        return this.upsertDependency(dependency);
    }

    #hasScript({ name }: Script): boolean {
        return !!this.#scripts[name];
    }

    upsertScript({ name, command }: Script): boolean {
        if (this.#scripts[name] === command) return false;
        this.#scripts[name] = command;
        return this.#modified = true;
    }

    updateScript({ name, command }: Script, upsert = false): boolean {
        if (!upsert && !this.#hasScript({ name, command })) return false;
        return this.upsertScript({ name, command });
    }
    
    validate() {
        const seenKeys = new Set<string>();

        for (const key in Object.keys({ ...this.#dependencies, ...this.#devDependencies })) {
            if (seenKeys.has(key)) {
                throw new WorkspaceValidationError(this, `${key} found in both dependencies and devDependencies`);
            }
            seenKeys.add(key);
        }
    }

    async save(): Promise<void> {
        this.validate();
        await writeFile(this.manifestLocation, JSON.stringify(this.manifest, undefined, 4));
    }

    async saveIfNeeded(): Promise<void> {
        if (this.#modified) return this.save();
    }
}
