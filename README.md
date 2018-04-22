# jira-cli

jira-cli is a minimalistic CLI client for Jira Software that fits perfectly in the agile development process. In short, it's the hacker's way of using Jira.

## Related Work

This CLI is heavily inspired by [jira-cmd](https://github.com/germanrcuriel/jira-cmd), however has been completely build from scratch.

## Installing

Currently, jira-cli is not available via NPM. Installing, however is pretty simple:

```bash
> git clone https://github.com/Rocketloop/jira-cli.git
> cd jira-cli
> npm install
> npm run build
> npm link
```

If you've set up NPM correctly, you should now be able to execute the `jira-cli` command from any directory.

## Usage

```
Usage: jira-cli [options] [command]

  Options:

    -h, --help                        output usage information

  Commands:

    backlog <project>
    board [options] <project>
    log [options] <issue> <duration>  Create a new worklog entry for the given issue
```

### Board

```
Usage: jira-cli board [options] <project>

  Options:

    -m, --mine  Only show issues assigned to me
    -h, --help  output usage information
```

### Log work

```
Usage: jira-cli log [options] <issue> <duration>

  Create a new worklog entry for the given issue

  Options:

    -m, --message <value>  The message for this work log
    -s, --start <time>     The start time for this work log, or now
    -h, --help             output usage information

```

## MIT License

Copyright (c) 2018 Florian Reifschneider <florian@rocketloop.de>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.