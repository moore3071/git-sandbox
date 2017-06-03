# Git Sandbox

[![Build Status](https://travis-ci.org/moore3071/git-sandbox.svg?branch=master)](https://travis-ci.org/moore3071/git-sandbox)

A simplified sandbox environment for learning Git hopefully with lessons later.

## Dependencies

### Overview

- Git submodules
  - josh.js: a cool browser terminal that you define the commands of
  - gitgraph: pretty git trees in the browser
- Node dependencies
  - harp: static site generator
- Node development dependencies
  - browserify: make the js useable in the browser
  - jasmine: unit testing because best practices
  - jsdoc: it's nice to know what's (suppposed to be) happening
  - node-sass: sass > css
  - sha1: I know it's deprecated, but it's not for security

### Installing

In order to install the dependencies before developing or using run:

```bash
npm install
```

## Running

In order to run cd into `src` and then run 

## FAQ (Frequently Anticipated Questions)

Although these questions might not have shown up, I'm guessing someone will ask them sooner or later.

- Q: Why are you using Git submodules?
  - A: Git submodules were used as Josh.js is not available on Node or Bower. Since Josh.js and Gitgraph are core dependencies for webpages, they were some of the first dependencies added before Node was such a major part.
- Q: Why use Harp instead of something like React or Meteor?
  - A: A static site generator was desired to allow for hosting on GitHub Pages. If I was planning on hosting this on a server on my own, it would have made more sense to actually use Git underneath.
- Q: Well then, why did you choose Harp over Wintersmith, Blacksmith, or other js static-site generators?
  - A: Why choose Rocky Road icecream instead of vanilla? Personal choice. I like the minimalism of harp that reminds me of Middleman.
- Q: Is feature x,y, or z of Git supported?
  - A: All supported commands should be listed once the site is up. If this answer is still here, then the site either isn't finished or I goofed up.
- Q: Why isn't feature x, y, or z included?
  - A: This is meant to be a simple interactive tutorial for newcomers to Git. As such only basic (porcelain) commands are included and even then might not be fully implemented. You may believe that there's a command or option missing that you use everyday. If that's the case then feel free to add it and make a pull request.
- Q: For 'anticipated' questions, it seems like you've had these hypothetical conversations in your head before.
  - A: ssh, don't judge me.
