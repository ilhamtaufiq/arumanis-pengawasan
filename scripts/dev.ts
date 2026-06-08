const server = Bun.spawn({
  cmd: ['bun', 'run', 'server/index.ts'],
  cwd: process.cwd(),
  env: {
    PORT: '3001',
    BUN_ENV: Bun.env.BUN_ENV ?? 'development',
  },
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
})

const client = Bun.spawn({
  cmd: ['bunx', 'vite', '--host', '0.0.0.0', '--port', '3000'],
  cwd: process.cwd(),
  env: {
    PORT: '3000',
  },
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
})

const [serverExit, clientExit] = await Promise.all([server.exited, client.exited])

if (serverExit !== 0) {
  client.kill()
  process.exit(serverExit)
}

client.kill()
process.exit(clientExit)

export {}
