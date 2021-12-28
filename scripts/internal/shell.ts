import { exec } from "child_process";

export interface ShellParameters {
    cwd?: string;
    shell?: string;
}

export default function shell(cmd: string, { cwd, shell = "/bin/zsh" }: ShellParameters = {}): Promise<{ stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
        exec(cmd, {
            cwd,
            shell
        }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}
