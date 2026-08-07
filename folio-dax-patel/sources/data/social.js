/**
 * MUST stay in this exact order (8 items) — matches the 3D icon ring angles.
 * Slot 5 was Twitch — replaced in-world with a LeetCode prop (see SocialArea.setLeetCodeIcon).
 * Order: X → Bluesky → YouTube → Resume → LeetCode → GitHub → LinkedIn → Discord
 */
export default [
    {
        name: 'X',
        url: 'https://x.com/dax_CG',
        align: 'right',
    },
    {
        name: 'Bluesky',
        align: 'right',
    },
    {
        name: 'YouTube',
        url: 'https://www.youtube.com/@BuildwithDax',
        align: 'right',
    },
    {
        name: 'Resume',
        url: '/resume/Dax-Patel.pdf',
        align: 'right',
    },
    {
        name: 'LeetCode',
        url: 'https://leetcode.com/u/daxCG/',
        align: 'right',
    },
    {
        name: 'GitHub',
        url: 'https://github.com/daxp472',
        align: 'right',
    },
    {
        name: 'LinkedIn',
        url: 'https://www.linkedin.com/in/dax-cg/',
        align: 'left',
    },
    {
        name: 'Discord',
        modal: 'discord',
        align: 'left',
    },
]
