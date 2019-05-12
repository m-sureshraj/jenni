# jenni

![npm](https://img.shields.io/npm/v/jenni.svg)

> Jenkins personal assistant - CLI tool to interact with Jenkins server

![jenni in action](https://raw.githubusercontent.com/m-sureshraj/jenni/HEAD/media/jenni-in-action.png "jenni in action")

Note - jenni will only work inside the **git** repository 

## Features
* Print Jenkins build history of a branch.
* Show estimated remaining time for running builds.
* Open Jenkins build in browser.

## Upcoming Features
* Trigger or abort a build

## Prerequisites
- Make sure you have Node.js `>= v8.11` installed.
- Jenkins **API Token** - [How to get a Jenkins API token](https://stackoverflow.com/questions/45466090/how-to-get-the-api-token-for-jenkins)

## Installation
```
> npm i -g jenni
```
Above installation will give you **globally** available `jen` command to intract with Jenkins server. 

## Setup
> Each git project will requires separate initialization.

`jen init` will walk you through to initialize jenni to your project.

![jen init](https://raw.githubusercontent.com/m-sureshraj/jenni/HEAD/media/jen-init.png "jen init")

## Usage
```
> jen --help

Usage: jen [options] [command]

Jenkins personal assistant

Options:
  -v, --version       output the version number
  -h, --help          output usage information

Commands:
  init                Initialize jen
  status|s            Print branch build status
  open|o              Open jenkins build in browser
  config|c [options]  Show repository jen configuration
```

| Command | Options | Description |
| --- | --- | --- |
| `jen init` | - | Initialize jenni to your project |
| `jen status` \| `s` | - | Print branch build history |
| `jen open` \| `o` | Optional build number <br><br> e.g. `jen open <build number>` | Open jenkins build in browser |
| `jen config` \| `c` | `--username` \| `-n` <br> `--token` \| `-t`  <br> `--url` \| `-u` <br> `--job` \| `-j` <br> <br> e.g. Reconfigure username & token <br> `jen config --username <foo> --token <bar>` | Overwrite project jenni config. Without any options it will print current config. |

## Debug
It's basic for the moment, but you can use `DEBUG_JEN=true` to log debug messages. E.g

```
> DEBUG_JEN=true jen status
```

## Feedback
I really interested in hearing about your use cases, insights, and suggestions for improvement. Please file issues [here](https://github.com/m-sureshraj/jenni/issues)

## license
MIT © [Sureshraj](https://github.com/m-sureshraj)
