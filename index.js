const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

(async () => {
    try {
        const pullRequest = github.context.payload.pull_request;
        if (pullRequest == null) {
            console.log("skip.");
            return;
        }

        const coverfunc = core.getInput('coverfunc');
        const out = fs.readFileSync(coverfunc, { encoding: 'utf-8' });
        const result = out.toString();
        // debug
        console.log(result);
        // 全体の結果だけ取得
        const parcent = parseCoverage(result);

        // コメント書き込む準備
        const githubToken = core.getInput('GITHUB_TOKEN');
        const octoKit = github.getOctokit(githubToken);

        // 既存のコメントを取得し、botが既に書き込んでいたら上書き、なければ新規でコメントする
        const comments = await octoKit.rest.issues.listComments({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: pullRequest.number
        });

        const botComments = comments.data.filter(comment => comment.user.login === 'github-actions[bot]');
        if (botComments.length > 0) {
            const commentSplit = botComments[0].body.split(' ');
            const prev = commentSplit[commentSplit.length - 1];
            // Update
            await octoKit.rest.issues.updateComment({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                comment_id: botComments[0].id,
                body: `Coverage: ${prev} -> ${parcent}`
            });
        } else {
            // Create
            await octoKit.rest.issues.createComment({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                issue_number: pullRequest.number,
                body: `Coverage: ${parcent}`
            });   
        }
        
    } catch (error) {
        core.setFailed(error.message);
    }
})();

/**
 * 
 * @param {string} stdout 
 * @return {string} parcentage
 */
function parseCoverage(stdout) {
    const lines = stdout.split('\n');
    console.log(lines.length);
    // 最後の一行をパース
    const totalLine = lines[lines.length - 2];
    console.log(totalLine);
    const totalSplit = totalLine.split('\t');
    return totalSplit[totalSplit.length - 1];
}
