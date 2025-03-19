import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // base: "/docs/",
  title: "ALEX ZHANG",
  description: "Freedom Loving Programmer",
  srcDir: './src',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.png',
    siteTitle: "ALEX ZHANG",
    nav: [
      { text: 'Home', link: '/' },
      { text: 'About', link: '/about/resume' },
      { text: 'Blog', link: '/blog' },
      { text: 'Knowledge', link: '/knowledge/fastapi/fastapi-database-connection-pool' },
      { text: 'Contact', link: '/markdown-examples' }
    ],

    sidebar: [
      {
        text: 'Knowlege',
        items: [
          { text: 'FastAPI Database Connection Pool', link: '/knowledge/fastapi/fastapi-database-connection-pool' },
          { text: 'FastAPI And Celery', link: '/knowledge/fastapi/fastapi-and-celery' },
          { text: 'Improving Latency of Database Calls in FastAPI', link: '/knowledge/fastapi/improving-latency-of-database-calls-in-fastapi' },
        ]
      },
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
      { icon: 'twitter', link: 'https://twitter.com/' },
      // { icon: 'facebook', link: 'https://www.facebook.com/' },
      { icon: 'linkedin', link: 'https://www.linkedin.com/' },
      // { icon: 'youtube', link: 'https://www.youtube.com/' },
      { icon: 'instagram', link: 'https://www.instagram.com/' },
    ],

    footer: {
      copyright: "Copyright © 2025 ALEX"
    },

    lastUpdated: {
      text: "Last Updated",
      formatOptions: {
        dateStyle: "medium",
        timeStyle: "short",
      },
    },
  }
})
