const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const secret = process.env.GH_WEBHOOK_SECRET;
const GHWebhook = require("express-github-webhook");
const webhookHandler = GHWebhook({ path: "/webhook", secret });
const fs = require("mz/fs");
const GitUrlParse = require("git-url-parse");
const os = require("os");
const chdproc = require("mz/child_process");
// Create repos folder and catch "already exists" error incase it is thrown.
fs.mkdir("repos")
    .catch(error => {
        if (error.message.includes("EEXIST")) return;
        else throw error;
    });

app.use(express.json());
app.use(webhookHandler);

webhookHandler.on("push", async (___USELESS___, data) => {
    // console.log(data);
    const author = data.head_commit.author.name;
    const cloneURL = data.repository.ssh_url;
    const repoUniqueHuman = data.repository.id+data.repository.full_name.replace("/", "-");
    const repoUniqueHumanAbs = process.cwd()+"/repos/"+data.repository.id+data.repository.full_name.replace("/", "-");
    const gbranch = data.ref.split("/")[2];
    // Cloning the repo
    const { source } = GitUrlParse(cloneURL); // example value: "github.com"
    // await chdproc.exec(`mkdir ~/.ssh; ssh-keyscan -t rsa ${source} >> ~/.ssh/known_hosts`);
    try {
        await chdproc.exec(`git clone --branch ${gbranch} ${cloneURL} repos/${repoUniqueHuman}`);
    } catch (error) {
        if (error.message.includes("already exists and is not an empty directory.")) {
            await chdproc.exec(`git pull`, {cwd: repoUniqueHumanAbs});
        }
        else throw error;
    }
    if (!(await fs.exists(`repos/${repoUniqueHuman}/Dockerfile`))) return console.log(`Dockerfile missing for ${data.repository.full_name}!`);
    if (!(await fs.exists(`repos/${repoUniqueHuman}/sdab.json`))) return console.log(`sdab.json missing for ${data.repository.full_name}!`);
    delete require.cache[`${repoUniqueHumanAbs}/sdab.json`]; // Clear cache
    const cfg = require(`${repoUniqueHumanAbs}/sdab.json`);
    const tagArg = `${cfg.customRegistry ? `${cfg.customRegistry}/` : ""}${cfg.tag}`;
    if (typeof cfg.tag !== "string") return console.log(`${data.repository.full_name} sdab.json: tag is not a string or is missing`);
    await chdproc.exec(`docker build -t ${tagArg} repos/${repoUniqueHuman}`);
    console.log(`${data.repository.full_name} event: built docker image ${cfg.tag}`);
    try {
        await chdproc.exec(cfg.customRegistry ? `docker login ${cfg.customRegistry}` : `docker login`);
    } catch (derr) {
        if (derr.message.includes("Cannot perform an interactive login")) {
            console.log(`${data.repository.full_name} ERROR: You have to login on the host first before starting a build.`);
            throw derr;
        } else throw derr;
    }
    console.log(`${data.repository.full_name} event: pushing docker image ${tagArg}`);
    console.log(await chdproc.exec(`docker push ${tagArg}`));
    console.log(`${data.repository.full_name} event: pushed docker image ${tagArg}`);
});

app.listen(port, () => console.log(`Listening on port ${port}`));