// ─── Windows Node.js v22 readlink fix ────────────────────────────────────────
// On Node.js v22 on Windows, fs.readlink() returns EISDIR for any non-symlink
// path. Next.js / @vercel/nft (build traces) and webpack both call readlink;
// each must be patched in the context where it runs:
//
//  1. Main process: patch fs.promises.readlink here at module load time.
//     @vercel/nft's collect-build-traces runs in the main process.
//
//  2. Webpack worker: webpack may run in a worker thread with an isolated
//     module scope, so patching the parent fs is not sufficient. We patch
//     compiler.inputFileSystem inside a webpack plugin's apply() method.

import fs from 'node:fs'

// Patch 2 – main process readdir (for Next.js route file scanner)
// On Windows, some directories (e.g. git-incomplete reparse points) are listed
// by the parent readdir but return EPERM when scanned. Treat them as empty.
// Patch both promise and callback forms since Next.js uses both.
;(function patchFsReaddir() {
    // promises form
    const origP = fs.promises.readdir.bind(fs.promises)
    fs.promises.readdir = async function (path, options) {
        try {
            return await origP(path, options)
        } catch (err) {
            if (err?.code === 'EPERM') return []
            throw err
        }
    }
    // callback form
    const origCb = fs.readdir.bind(fs)
    fs.readdir = function (path, options, callback) {
        if (typeof options === 'function') { callback = options; options = undefined }
        origCb(path, options, function (err, result) {
            if (err?.code === 'EPERM') callback(null, [])
            else callback(err, result)
        })
    }
})()

// Patch 1 – main process fs.promises.readlink (for @vercel/nft)
;(function patchFsPromisesReadlink() {
    const orig = fs.promises.readlink.bind(fs.promises)
    fs.promises.readlink = async function (path, options) {
        try {
            return await orig(path, options)
        } catch (err) {
            if (err?.code === 'EISDIR') {
                const e = new Error(`EINVAL: invalid argument, readlink '${path}'`)
                e.code = 'EINVAL'; e.syscall = 'readlink'; e.path = path
                throw e
            }
            throw err
        }
    }
})()

/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    webpack: (config) => {
        const ifs = config.infrastructureLogging ?? {}
        const inputFS = config.resolve?.fileSystem ?? null

        // Patch the compiler's inputFileSystem once via a plugin.
        // The plugin's apply() runs in the webpack worker context.
        config.plugins = config.plugins ?? []
        config.plugins.push({
            apply(compiler) {
                function patchReadlink(fs) {
                    if (!fs || typeof fs.readlink !== 'function') return
                    const orig = fs.readlink.bind(fs)
                    fs.readlink = function (path, callback) {
                        orig(path, function (err, result) {
                            if (err?.code === 'EISDIR') {
                                const e = new Error(`EINVAL: invalid argument, readlink '${path}'`)
                                e.code = 'EINVAL'; e.syscall = 'readlink'; e.path = path
                                callback(e)
                            } else {
                                callback(err, result)
                            }
                        })
                    }
                }
                function patchReaddir(fs) {
                    if (!fs || typeof fs.readdir !== 'function') return
                    const orig = fs.readdir.bind(fs)
                    fs.readdir = function (path, options, callback) {
                        if (typeof options === 'function') { callback = options; options = undefined }
                        orig(path, options, function (err, result) {
                            if (err?.code === 'EPERM') callback(null, [])
                            else callback(err, result)
                        })
                    }
                }
                patchReadlink(compiler.inputFileSystem)
                patchReaddir(compiler.inputFileSystem)
                compiler.hooks.afterEnvironment.tap('ReadlinkEisdirFix', () => {
                    patchReadlink(compiler.inputFileSystem)
                    patchReaddir(compiler.inputFileSystem)
                })
            },
        })

        return config
    },
}

export default nextConfig;
