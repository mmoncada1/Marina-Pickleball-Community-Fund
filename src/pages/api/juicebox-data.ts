import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { projectId = '107' } = req.query

  try {
    // Fetch the Juicebox project page for Base network project #107
    const response = await fetch(`https://juicebox.money/v4/base:${projectId}`, {
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

    // Alternative patterns to try for Base network
    if (totalRaised === 0) {
      // Try to find dollar amounts in the page
      const dollarMatches = html.match(/\$(\d+(?:\.\d+)?)/g)
      if (dollarMatches && dollarMatches.length > 0) {
        // Find the largest dollar amount, which is likely the total raised
        const amounts = dollarMatches.map(match => parseFloat(match.replace('$', '')))
        totalRaised = Math.max(...amounts.filter(amount => amount > 0 && amount < 50000))
      }
    }

    // Also try looking for ETH amounts since this is Base network
    if (totalRaised === 0) {
      const ethMatches = html.match(/(\d+(?:\.\d+)?)\s*ETH/gi)
      if (ethMatches && ethMatches.length > 0) {
        const ethAmounts = ethMatches.map(match => parseFloat(match.replace(/\s*ETH/i, '')))
        const maxEth = Math.max(...ethAmounts.filter(amount => amount > 0))
        // Convert ETH to USD (rough estimate)
        totalRaised = Math.round(maxEth * 3000) // Assuming ~$3000 per ETH
      }
    }

    console.log('Scraped data from Base project:', { totalRaised, contributorCount })

    res.status(200).json({
      totalRaised,
      contributorCount,
      success: true,
      network: 'base',
      projectId,
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
