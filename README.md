# jenni - Beta version
> Jenkins personal assistant - CLI tool to interact with Jenkins server

Note - jenni will only work inside the **git** repository 

## Features
> List of available features for the moment.   
* Print Jenkins build history of a branch
* Open Jenkins build in browser.

### Prerequisites
- Make sure you have Node.js `>= v8.11` installed.
- Jenkins **API Token** - [How to get a Jenkins API token](https://stackoverflow.com/questions/45466090/how-to-get-the-api-token-for-jenkins)

### Installation
```
> npm i -g jenni@0.1.0-beta.0
```
Above installation will give you **globally** available `jen` command to intract with Jenkins server. 

### Usage
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
  open|o              Open jenkins build in the browser
  config|c [options]  Show repository jen configuration

```

### Setup
> Each git project will requires separate initialization.

`jen init` will walk you through to initialize jenni to your project. 

### Debug
It's basic for the moment, but you can use `DEBUG_JEN=true` to log debug messages.

### Feedback
I don't have much experience with Jenkins for the moment. So this tool does not cover all the Jenkins use cases. Initially I created this tool for myself just to display the build history. Later realized this tool will helpful to others as well (specially for my team). I really interested in hearing about your use cases, insights, and suggestions for improvement.

