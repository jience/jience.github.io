import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // base: "/docs/",
  title: "Alex's Workspace",
  description: "Discover the magical journey",
  srcDir: './src',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.png',
    siteTitle: "Alex Zhang",
    nav: [
      { text: 'Home', link: '/' },
      { text: 'About', link: '/about' },
      { text: 'Blog', link: '/blog' },
      { text: 'Knowledge', link: '/knowledge' },
      { text: 'Contact', link: '/markdown-examples' }
    ],

    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jience' },
      // { icon: 'twitter', link: 'https://twitter.com/' },
      // { icon: 'facebook', link: 'https://www.facebook.com/' },
      { icon: 'linkedin', link: 'https://www.linkedin.com/' },
      // { icon: 'youtube', link: 'https://www.youtube.com/' },
      { icon: 'instagram', link: 'https://www.instagram.com/' },
    ],

    footer: {
      copyright: "Copyright © 2025 Alex Zhang"
    }
  }
})
