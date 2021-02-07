#!/usr/bin/env node

const cp = require("child_process")
const crypto = require("crypto")
const fs = require("fs").promises
const path = require("path")

const VERSION = "1.0.0"

const helpText = () => (
  "ci-once v" + VERSION + " <https://github.com/vain0x/npm-ci-once>\n"
  + "\n"
  + "EXAMPLE:\n"
  + "    npx ci-once\n"
  + "\n"
  + "OPTIONS:\n"
  + "    -v, --verbose    Emit debug logs\n"
  + "    -V, --version    Print version number\n"
  + "    -h, --help       Print help text\n"
)

// Options
let relativeCachePath = "node_modules/.package-lock-sha256"
let verbose = false

// -----------------------------------------------
// Logging
// -----------------------------------------------

const debug = (...args) => {
  if (verbose) {
    console.log("ci-once: debug:", ...args)
  }
}

const info = (...args) => {
  console.log("ci-once: info:", ...args)
}

const error = (...args) => {
  console.error("ci-once: ERROR:", ...args)
}

// -----------------------------------------------
// Util
// -----------------------------------------------

const sha256 = contents =>
  crypto.createHash("sha256")
    .update(contents)
    .digest("hex")

// -----------------------------------------------
// Main
// -----------------------------------------------

const readArgs = () => {
  const args = process.argv
  let i = 1

  while (i < args.length) {
    const arg = args[i]
    i++

    switch (arg) {
      case "-h":
      case "--help": {
        process.stdout.write(helpText())
        process.exit(0)
      }
      case "-V":
      case "--version": {
        process.stdout.write(VERSION)
        process.exit(0)
      }
      case "-v":
      case "--verbose": {
        verbose = true
        continue
      }
      default:
        if (arg.endsWith(".js") || arg.endsWith("/npm-ci-once")) {
          continue
        }

        error("Unknown argument '" + arg + "'.")
        process.exit(1)
    }
  }
}

// NOTE: Avoid using `async` function for old Node.js.
const main = async () => {
  readArgs()

  const cachePath = path.join(process.cwd(), relativeCachePath)
  debug("Hash value is read from '" + cachePath + "'.")

  const [oldHash, newHash] = await Promise.all([
    fs.readFile(cachePath, { encoding: "utf-8" }).catch(() => null),
    fs.readFile("package-lock.json").then(sha256).catch(err => err),
  ])

  if (typeof newHash !== "string") {
    throw new Error("package-lock.json can't be read. " + String(newHash))
  }

  debug("Recorded hash value: " + (oldHash || "not found"))
  debug("Computed  hash value: " + newHash)

  if (oldHash != null && oldHash === newHash) {
    debug("package-lock.json was unchanged.")
    return
  }

  const runNpmCi = () => new Promise((resolve, reject) => {
    info("Running npm ci...")

    const p = cp.spawn("npm ci", { shell: true, stdio: "inherit" })
    p.on("error", err => {
      reject("npm ci reported some error: " + err)
    })

    p.on("exit", code => {
      if (code === 0) {
        resolve()
      } else {
        reject("npm ci exited with non-zero code: " + code)
      }
    })
  })

  await runNpmCi()
  debug("npm ci finished.")
  await fs.mkdir(path.dirname(cachePath), { recursive: true })
  await fs.writeFile(cachePath, newHash)
  debug("Hash value is written.")
}

main().catch(err => {
  error(err)
  process.exit(1)
})
