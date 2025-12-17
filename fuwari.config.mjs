import defineConfig from '@byte.n/fuwari/cli';

export default defineConfig({
    astroConfig: {
        outDir: 'dist',
        postsDir: 'content',
        base: '/blog/',
    },
    theme: {
        site: {
            title: 'Byte.n',
            subtitle: 'Demo Site',
            lang: 'zh_CN', // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
            themeColor: {
                hue: 250, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
                fixed: false, // Hide the theme color picker for visitors
            },
            banner: {
                enable: true,
                src: 'assets/home-banner.webp', // Relative to the /src directory. Relative to the /public directory if it starts with '/'
                position: 'center', // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
                credit: {
                    enable: true, // Display the credit text of the banner image
                    text: '空色天絵 / NEO TOKYO NOIR 01', // Credit text to be displayed
                    url: 'https://www.pixiv.net/artworks/111024784', // (Optional) URL link to the original artwork or artist's page
                },
            },
            toc: {
                enable: true, // Display the table of contents on the right side of the post
                depth: 2, // Maximum heading depth to show in the table, from 1 to 3
            },
            favicon: [
                // Leave this array empty to use the default favicon
                // {
                //   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
                //   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
                //   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
                // }
            ],
        },
        navBar: {
            links: [
                0,1,2,
                {
                    name: 'GitHub',
                    url: 'https://github.com/Byte-n', // Internal links should not include the base path, as it is automatically added
                    external: true, // Show an external link icon and will open in a new tab
                },
            ],
        },
        license: {
            enable: true,
            name: 'CC BY-NC-SA 4.0',
            url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
        },
        expressive: {
            theme: 'github-dark',
        },
        profile: {
            avatar: 'https://avatars.githubusercontent.com/u/65855612?v=4', // Relative to the /src directory. Relative to the /public directory if it starts with '/'
            name: 'Byte.n',
            bio: 'Byte.n Byte.n Byte.n',
            links: [
                {
                    name: 'GitHub',
                    icon: 'fa6-brands:github',
                    url: 'https://github.com/saicaca/fuwari',
                },
            ],
        },
    },
});
