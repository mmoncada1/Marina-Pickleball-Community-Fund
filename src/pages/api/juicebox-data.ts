import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { projectId } = req.query

  try {
    // Fetch the Juicebox project page
    const response = await fetch(`https://juicebox.money/v4/eth:${projectId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch Juicebox page')
    }

    const html = await response.text()
    
    // Extract data from the HTML
    let totalRaised = 0
    let contributorCount = 0

    // Look for the "TOTAL RAISED" text pattern
    const totalRaisedMatch = html.match(/TOTAL RAISED\$(\d+)/i)
    if (totalRaisedMatch) {
      totalRaised = parseInt(totalRaisedMatch[1])
    }

    // Look for the "PAYMENTS" text pattern
    const paymentsMatch = html.match(/PAYMENTS(\d+)/i)
    if (paymentsMatch) {
      contributorCount = parseInt(paymentsMatch[1])
    }

    // Alternative patterns to try
    if (totalRaised === 0) {
      // Try to find dollar amounts in the page
      const dollarMatches = html.match(/\$(\d+)/g)
      if (dollarMatches && dollarMatches.length > 0) {
        // Find the largest dollar amount, which is likely the total raised
        const amounts = dollarMatches.map(match => parseInt(match.replace('$', '')))
        totalRaised = Math.max(...amounts.filter(amount => amount > 0 && amount < 10000))
      }
    }

    console.log('Scraped data:', { totalRaised, contributorCount })

    res.status(200).json({
      totalRaised,
      contributorCount,
      success: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error scraping Juicebox data:', error)
    res.status(500).json({
      error: 'Failed to scrape data',
      success: false
    })
  }
}
