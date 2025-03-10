import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/docs/",
  title: "My Awesome Project",
  description: "A VitePress Site",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Work', link: '/work' },
      { text: 'Examples', link: '/markdown-examples' }
    ],

    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' }
        ]
      },
      {
        text: 'Work',
        items: [
          { text: 'ETCD使用', link: '/work/ETCD使用' },
          { text: 'MYSQL优化', link: '/work/MySQL优化' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jience' }
    ]
  }
})
