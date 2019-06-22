const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const secret = process.env.GH_WEBHOOK_SECRET;
const GHWebhook = require("express-github-webhook");
const webhookHandler = GHWebhook({ path: "/webhook", secret });
const fs = require("mz/fs");
const GitUrlParse = require("git-url-parse");
require("log-node")();
const log = require("log");
const chdproc = require("mz/child_process");
const { MessageBuilder } = require("webhook-discord");
const DiscordWebhook = require("webhook-discord").Webhook;
const discord = process.env.DISCORD_WEBHOOK_URL
    ? new DiscordWebhook(process.env.DISCORD_WEBHOOK_URL)
    : undefined;
const dbOpts = {
    db: process.env.db || `sdab`
};
if (process.env.DB_ADDR)
    dbOpts.servers = [
        {
            host: process.env.DB_ADDR.split(":")[0],
            port: parseInt(process.env.DB_ADDR.split(":")[1], 10)
        }
    ];
const origConsoleLog = console.log;
console.log = log;
const r = require(`rethinkdbdash`)(dbOpts); // Connect to RethinkDB
console.log = origConsoleLog;

// Create repos folder and catch "already exists" error incase it is thrown.
fs.mkdir("repos").catch((error) => {
    if (error.message.includes("EEXIST")) return;
    else throw error;
});
async function createDBStruct() {
    r.tableCreate("builds");
}
createDBStruct().catch(() => {});
app.use(express.json());
app.use(webhookHandler);

webhookHandler.on("push", async (___USELESS___, data) => {
    try {
        await handlePush(data);
    } catch (error) {
        log.error(error);
        await r.table("builds").update({
            id: data.after,
            status: "fail",
            statusReason: error.message,
            updatedAt: Date.now()
        });
        if (discord)
            discord.send(
                new MessageBuilder()
                    .setName("sdab CI")
                    .setColor("#ff0000")
                    .setTitle(`Fail: ${data.repository.full_name}`)
                    .setDescription(error)
            );
    }
});

async function handlePush(data) {
    if (process.env.DEBUG_PRINT_REQ === "TRUE") console.log(data);
    const head_sha = data.after;
    const author = data.head_commit.author.name;
    const commitMsg = data.head_commit.message;
    const cloneURL = data.repository.ssh_url;
    const repoUniqueHuman =
        data.repository.id + data.repository.full_name.replace("/", "-");
    const repoUniqueHumanAbs =
        process.cwd() +
        "/repos/" +
        data.repository.id +
        data.repository.full_name.replace("/", "-");
    const gbranch = data.ref.split("/")[2];

    await r.table("builds").insert({
        id: head_sha,
        status: "processing",
        createdAt: Date.now(),
        repo: {
            id: data.repository.id,
            name: data.repository.name,
            author,
            commitMsg,
            authorID: data.head_commit.author.id,
            owner: data.repository.owner.name,
            ownerID: data.repository.owner.id
        }
    });
    if (discord)
        discord.send(
            new MessageBuilder()
                .setName("sdab CI")
                .setColor("#fffff")
                .setTitle(`Started: ${data.repository.full_name}`)
        );

    // Cloning the repo
    const { source } = GitUrlParse(cloneURL); // example value: "github.com"
    // await chdproc.exec(`mkdir ~/.ssh; ssh-keyscan -t rsa ${source} >> ~/.ssh/known_hosts`);
    try {
        await chdproc.exec(
            `git clone --branch ${gbranch} ${cloneURL} repos/${repoUniqueHuman}`
        );
    } catch (error) {
        if (
            error.message.includes(
                "already exists and is not an empty directory."
            )
        ) {
            await chdproc.exec(`git pull`, { cwd: repoUniqueHumanAbs });
        } else throw error;
    }

    if (!(await fs.exists(`repos/${repoUniqueHuman}/Dockerfile`)))
        throw new Error(`Dockerfile missing for ${data.repository.full_name}!`);
    if (!(await fs.exists(`repos/${repoUniqueHuman}/sdab.json`)))
        throw new Error(`sdab.json missing for ${data.repository.full_name}!`);

    delete require.cache[`${repoUniqueHumanAbs}/sdab.json`]; // Clear cache
    const cfg = require(`${repoUniqueHumanAbs}/sdab.json`);
    const tagArg = `${cfg.customRegistry ? `${cfg.customRegistry}/` : ""}${
        cfg.tag
    }`;
    if (typeof cfg.tag !== "string")
        throw new Error(
            `${
                data.repository.full_name
            } sdab.json: tag is not a string or is missing`
        );
    const buildLog = await chdproc.exec(
        `docker build -t ${tagArg} repos/${repoUniqueHuman}`
    );
    log(buildLog);
    log(`${data.repository.full_name} event: building docker image ${cfg.tag}`);
    log(`${data.repository.full_name} event: built docker image ${cfg.tag}`);
    try {
        await chdproc.exec(
            cfg.customRegistry
                ? `docker login ${cfg.customRegistry}`
                : `docker login`
        );
    } catch (derr) {
        if (derr.message.includes("Cannot perform an interactive login")) {
            console.log(
                `${Date()}: ${
                    data.repository.full_name
                } ERROR: You have to login on the host first before starting a build.`
            );
            throw derr;
        } else throw derr;
    }
    log(`${data.repository.full_name} event: pushing docker image ${tagArg}`);
    log(await chdproc.exec(`docker push ${tagArg}`));
    log(`${data.repository.full_name} event: pushed docker image ${tagArg}`);
    if (discord)
        discord.send(
            new MessageBuilder()
                .setName("sdab CI")
                .setColor("#0000ff")
                .setTitle(`success: ${data.repository.full_name}`)
                .setDescription("```" + buildLog + "```")
        );
    await r.table("builds").update({
        id: head_sha,
        status: "ok",
        updatedAt: Date.now()
    });
}

app.listen(port, () => log(`Listening on port ${port}`));
