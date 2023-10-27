<div align="center">

# @tinyhttp/favicon

[![npm][npm-img]][npm-url] [![GitHub Workflow Status][gh-actions-img]][github-actions] [![Coverage][cov-img]][cov-url]

</div>

> A rewrite of [serve-favicon](https://github.com/expressjs/serve-favicon) module.

Node.js middleware to serve `favicon.ico` file.

## Install

```sh
pnpm i @tinyhttp/favicon
```

## API

```js
import { favicon } from '@tinyhttp/favicon'
```

### Options

`favicon` accepts these properties in the options object.

#### `path`

Path to icon, required. Passed as the first argument.

#### `maxAge`

Sets `Cache-Control: maxAge=` header, optional. Default is one year. Passed with object in the second argument.

## Example

```js
import { favicon } from '@tinyhttp/favicon'
import { createServer } from 'node:http'
import path from 'node:path'

createServer(favicon(path.join(process.cwd(), 'public', 'favicon.ico')).listen(3000)
```

[npm-url]: https://npmjs.com/package/@tinyhttp/favicon
[github-actions]: https://github.com/tinyhttp/favicon/actions
[gh-actions-img]: https://img.shields.io/github/actions/workflow/status/tinyhttp/favicon/ci.yml?style=for-the-badge&logo=github&label=&color=hotpink
[cov-img]: https://img.shields.io/coveralls/github/tinyhttp/favicon?style=for-the-badge&color=hotpink
[cov-url]: https://coveralls.io/github/tinyhttp/favicon
[npm-img]: https://img.shields.io/npm/dt/@tinyhttp/favicon?style=for-the-badge&color=hotpink
