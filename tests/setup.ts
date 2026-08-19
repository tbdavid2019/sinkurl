import fs from 'node:fs'

export default function () {
  const envSource = fs.existsSync('.env') ? '.env' : fs.existsSync('.env.example') ? '.env.example' : null
  if (envSource) {
    fs.copyFileSync(envSource, '.dev.vars')
  }

  return () => {
    if (fs.existsSync('.dev.vars')) {
      fs.rmSync('.dev.vars')
    }
  }
}
