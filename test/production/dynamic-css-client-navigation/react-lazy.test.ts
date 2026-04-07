import { nextTestSetup } from 'e2e-utils'

describe.each(['edge', 'nodejs'])(
  'dynamic-css-client-navigation react lazy %s',
  (runtime) => {
    const { next } = nextTestSetup({
      files: __dirname,
    })

    it(`should not remove style when navigating from static imported component to react lazy at runtime ${runtime}`, async () => {
      const browser = await next.browser(`/${runtime}`)

      await browser.elementByCss(`a[href="/${runtime}/react-lazy"]`).click()

      // Wait for the navigation to the destination URL to complete.
      // Without this, waitForElementByCss('#red-button') can resolve
      // immediately from the *index* page's button (which also renders
      // RedButton), causing the subsequent eval to run while the page is
      // mid-navigation and document.querySelector('button') returns null.
      // This race is especially pronounced for the 'edge' runtime where the
      // destination page's JS chunks are not prefetched as aggressively.
      await browser.waitForCondition(
        `window.location.pathname === '/${runtime}/react-lazy'`
      )

      expect(await browser.waitForElementByCss('#red-button').text()).toBe(
        'Red Button'
      )

      const buttonBgColor = await browser.eval(
        `window.getComputedStyle(document.querySelector('button')).backgroundColor`
      )

      expect(buttonBgColor).toBe('rgb(255, 0, 0)')
    })
  }
)
