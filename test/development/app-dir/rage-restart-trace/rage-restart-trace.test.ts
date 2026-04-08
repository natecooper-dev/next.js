import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { nextTestSetup } from 'e2e-utils'
import { parseTraceFile } from '../../../lib/parse-trace-file'

describe('rage restart trace attributes', () => {
  // Use a fake upload URL so traceUploadUrl is set and detection runs.
  // The URL doesn't need to be reachable — we inspect the trace file directly.
  const fakeUploadUrl = 'http://localhost:19999'

  const { next, isNextDev } = nextTestSetup({
    files: __dirname,
    skipStart: true,
    startArgs: ['--experimental-upload-trace', fakeUploadUrl],
  })

  if (!isNextDev) {
    it('should be skipped in production', () => {})
    return
  }

  const getTracePath = () => join(next.testDir, '.next/dev/trace')

  const getStartDevServerSpan = () => {
    const traceStructure = parseTraceFile(getTracePath())
    const spans = traceStructure.eventsByName.get('start-dev-server')
    expect(spans).toBeDefined()
    expect(spans?.length).toBeGreaterThan(0)
    // Trace file is appended across restarts; take the most recent span.
    return spans?.[spans.length - 1]
  }

  it('should not set rage-restart on first start', async () => {
    await next.start()
    await next.render$('/')
    await next.stop('SIGTERM')

    const span = getStartDevServerSpan()
    expect(span?.tags?.['rage-restart']).toBe(false)
    expect(span?.tags?.['missing-next-dir']).toBe(false)
  })

  it('should set rage-restart when restarted within threshold', async () => {
    // State file was written by the previous test's stop — restart immediately.
    await next.start()
    await next.render$('/')
    await next.stop('SIGTERM')

    const span = getStartDevServerSpan()
    expect(span?.tags?.['rage-restart']).toBe(true)
    expect(span?.tags?.['missing-next-dir']).toBe(false)
  })

  it('should set missing-next-dir when .next is deleted before restart', async () => {
    // Delete .next to simulate the user clearing the build cache.
    rmSync(join(next.testDir, '.next'), { recursive: true, force: true })

    // Restart — state file still exists from previous test, .next does not.
    await next.start()
    await next.render$('/')
    await next.stop('SIGTERM')

    const span = getStartDevServerSpan()
    expect(span?.tags?.['rage-restart']).toBe(true)
    expect(span?.tags?.['missing-next-dir']).toBe(true)
  })
})
