const { readFileSync, writeFileSync, mkdirSync } = require('fs');
const { Octokit } = require('@octokit/rest');

// Initialize Octokit
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

// Load points configuration
const pointsConfig = JSON.parse(
    readFileSync('.github/points_config.json', 'utf8')
);

// Get all contributions (issues and PRs)
async function getContributions() {
    const [issues, prs] = await Promise.all([
        octokit.paginate(octokit.rest.issues.listForRepo, {
            owner: process.env.REPO_OWNER,
            repo: process.env.REPO_NAME,
            state: 'all',
        }),
        octokit.paginate(octokit.rest.pulls.list, {
            owner: process.env.REPO_OWNER,
            repo: process.env.REPO_NAME,
            state: 'all',
        })
    ]);

    return [...issues, ...prs].filter(item =>
        item.state === 'closed' &&
        item.user.type === 'User' &&
        !item.user.login.includes('[bot]')
    );
}

// Calculate scores
async function calculateScores() {
    const contributions = await getContributions();
    const scores = {};

    contributions.forEach(contribution => {
        const user = contribution.user.login;
        const labels = contribution.labels.map(l => l.name);

        labels.forEach(label => {
            scores[user] = (scores[user] || 0) + (pointsConfig[label] || 0);
        });
    });

    return Object.entries(scores)
        .sort(([,a], [,b]) => b - a)
        .map(([user, score]) => ({ user, score }));
}

// Generate markdown table
function generateMarkdown(scores) {
    let md = '| Contributor | Points |\n| :--- | ---: |\n';
    scores.forEach(({ user, score }) => {
        md += `| [@${user}](https://github.com/${user}) | ${score} |\n`;
    });
    return md;
}

// Main execution
(async () => {
    try {
        const scores = await calculateScores();
        const markdown = generateMarkdown(scores);
        mkdirSync('website', { recursive: true });
        writeFileSync('website/leaderboard.md', markdown);
        console.log('Successfully updated leaderboard!');
    } catch (error) {
        console.error('Error updating leaderboard:', error);
        process.exit(1);
    }
})();  